import type {
    LibraryEntry,
    LibraryFieldSchema,
    LibraryReferenceInput,
    LibraryRelationshipSchema,
    LibraryResolutionProposal,
    LibrarySchema,
} from "./types.js";
import { canonicalizeLanguageTag } from "./language.js";

const ID_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

function assertIdentifier(value: string, code: string): void {
    if (!ID_PATTERN.test(value)) throw new Error(code);
}

function validateField(field: LibraryFieldSchema, ids: Set<string>): void {
    assertIdentifier(field.id, "invalid_field_id");
    if (ids.has(field.id)) throw new Error("duplicate_field");
    if (!field.label.trim()) throw new Error("field_label_required");
    ids.add(field.id);
}

function validateRelationship(
    relationship: LibraryRelationshipSchema,
    layerIds: Set<string>,
    ids: Set<string>,
): void {
    assertIdentifier(relationship.id, "invalid_relationship_id");
    if (ids.has(relationship.id)) throw new Error("duplicate_relationship");
    if (!layerIds.has(relationship.targetLayer))
        throw new Error("relationship_target_not_found");
    if (!relationship.label.trim())
        throw new Error("relationship_label_required");
    const minimum = relationship.minimum ?? 0;
    const maximum = relationship.maximum ?? Number.POSITIVE_INFINITY;
    if (minimum < 0 || maximum < 1 || minimum > maximum)
        throw new Error("invalid_cardinality");
    ids.add(relationship.id);
}

export function validateLibrarySchema(schema: LibrarySchema): LibrarySchema {
    assertIdentifier(schema.id, "invalid_schema_id");
    if (!Number.isSafeInteger(schema.version) || schema.version < 1)
        throw new Error("invalid_schema_version");
    if (!schema.language.trim() || !schema.label.trim())
        throw new Error("schema_metadata_required");
    if (schema.layers.length === 0) throw new Error("layers_required");
    const layerIds = new Set<string>();
    for (const layer of schema.layers) {
        assertIdentifier(layer.id, "invalid_layer_id");
        if (layerIds.has(layer.id)) throw new Error("duplicate_layer");
        if (!layer.label.trim()) throw new Error("layer_label_required");
        layerIds.add(layer.id);
    }
    for (const layer of schema.layers) {
        const fieldIds = new Set<string>();
        for (const field of layer.fields ?? []) validateField(field, fieldIds);
        const relationshipIds = new Set<string>();
        for (const relationship of layer.relationships ?? []) {
            validateRelationship(relationship, layerIds, relationshipIds);
        }
    }
    return structuredClone({
        ...schema,
        language: canonicalizeLanguageTag(schema.language),
    });
}

export function findLayer(schema: LibrarySchema, layerId: string) {
    const layer = schema.layers.find(({ id }) => id === layerId);
    if (!layer) throw new Error("layer_not_found");
    return layer;
}

export function validateFields(
    schema: LibrarySchema,
    layerId: string,
    values: Record<string, unknown>,
): void {
    const fields = findLayer(schema, layerId).fields ?? [];
    const configured = new Map(fields.map((field) => [field.id, field]));
    for (const key of Object.keys(values)) {
        if (!configured.has(key)) throw new Error(`unknown_field:${key}`);
    }
    for (const field of fields) {
        const value = values[field.id];
        if (field.required && (value === undefined || value === ""))
            throw new Error(`field_required:${field.id}`);
        if (value !== undefined && typeof value !== field.type)
            throw new Error(`invalid_field_type:${field.id}`);
    }
}

export function validateReferences(
    schema: LibrarySchema,
    layerId: string,
    references: readonly LibraryReferenceInput[],
    targets: ReadonlyMap<string, LibraryEntry>,
): void {
    const relationships = new Map(
        (findLayer(schema, layerId).relationships ?? []).map((item) => [
            item.id,
            item,
        ]),
    );
    for (const reference of references) {
        const relationship = relationships.get(reference.relation);
        if (!relationship) throw new Error("relationship_not_found");
        const target = targets.get(reference.entryId);
        if (!target) throw new Error("reference_not_found");
        if (
            target.schemaId !== schema.id ||
            target.schemaVersion !== schema.version ||
            target.layer !== relationship.targetLayer
        ) {
            throw new Error("invalid_relationship_target");
        }
    }
    for (const relationship of relationships.values()) {
        const matching = references.filter(
            ({ relation }) => relation === relationship.id,
        );
        if (matching.length < (relationship.minimum ?? 0))
            throw new Error(`relationship_minimum:${relationship.id}`);
        if (
            relationship.maximum !== undefined &&
            matching.length > relationship.maximum
        ) {
            throw new Error(`relationship_maximum:${relationship.id}`);
        }
        if (!relationship.ordered && matching.some(({ position }) => position))
            throw new Error(`relationship_not_ordered:${relationship.id}`);
    }
}

function graphemes(value: string): string[] {
    const Segmenter = Intl.Segmenter;
    return Array.from(
        new Segmenter(undefined, { granularity: "grapheme" }).segment(
            value.normalize("NFC"),
        ),
        ({ segment }) => segment,
    );
}

export function resolveRelationships(
    schema: LibrarySchema,
    layerId: string,
    label: string,
    candidates: readonly LibraryEntry[],
): LibraryResolutionProposal[] {
    const relationships = findLayer(schema, layerId).relationships ?? [];
    return relationships
        .filter(({ resolver }) => resolver && resolver !== "explicit")
        .map((relationship) => {
            const available = candidates.filter(
                (entry) =>
                    entry.schemaId === schema.id &&
                    entry.schemaVersion === schema.version &&
                    entry.layer === relationship.targetLayer,
            );
            const units =
                relationship.resolver === "grapheme"
                    ? graphemes(label)
                    : label.normalize("NFC").split(/\s+/u).filter(Boolean);
            const references: LibraryReferenceInput[] = [];
            const unresolved: string[] = [];
            units.forEach((unit, position) => {
                const matches = available.filter(
                    (entry) => entry.label.normalize("NFC") === unit,
                );
                if (matches.length !== 1) {
                    unresolved.push(unit);
                    return;
                }
                references.push({
                    entryId: matches[0].id,
                    relation: relationship.id,
                    position: relationship.ordered ? position : undefined,
                });
            });
            return {
                relationship: relationship.id,
                references,
                unresolved,
                resolver: relationship.resolver!,
                deterministic: unresolved.length === 0,
            };
        });
}
