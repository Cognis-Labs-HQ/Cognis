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
const ROLE_PATTERN = /^[a-z][a-zA-Z0-9]*(?::[a-z][a-zA-Z0-9]*)*$/;

function validateLocalizedText(value: unknown, code: string): void {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error(code);
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) throw new Error(code);
    for (const [locale, text] of entries) {
        canonicalizeLanguageTag(locale);
        if (typeof text !== "string" || !text.trim()) throw new Error(code);
    }
}

function validateMetadata(
    metadata: {
        labels: Record<string, string>;
        descriptions?: Record<string, string>;
    },
    code: string,
): void {
    validateLocalizedText(metadata?.labels, code);
    if (metadata.descriptions !== undefined)
        validateLocalizedText(metadata.descriptions, code);
}

function assertIdentifier(value: string, code: string): void {
    if (!ID_PATTERN.test(value)) throw new Error(code);
}

function validateField(field: LibraryFieldSchema, ids: Set<string>): void {
    assertIdentifier(field.id, "invalid_field_id");
    if (ids.has(field.id)) throw new Error("duplicate_field");
    validateMetadata(field.metadata, "field_metadata_required");
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
    validateMetadata(relationship.metadata, "relationship_metadata_required");
    const minimum = relationship.minimum ?? 0;
    const maximum = relationship.maximum ?? Number.POSITIVE_INFINITY;
    if (minimum < 0 || maximum < 1 || minimum > maximum)
        throw new Error("invalid_cardinality");
    if (relationship.requiredTarget && minimum < 1)
        throw new Error("required_target_needs_minimum");
    if (!relationship.onDelete) throw new Error("deletion_behavior_required");
    ids.add(relationship.id);
}

export function validateLibrarySchema(schema: LibrarySchema): LibrarySchema {
    assertIdentifier(schema.id, "invalid_schema_id");
    if (!Number.isSafeInteger(schema.version) || schema.version < 1)
        throw new Error("invalid_schema_version");
    assertIdentifier(schema.namespace, "invalid_schema_namespace");
    if (!schema.language.trim()) throw new Error("schema_metadata_required");
    validateMetadata(schema.metadata, "schema_metadata_required");
    if (schema.layers.length === 0) throw new Error("layers_required");
    const layerIds = new Set<string>();
    for (const layer of schema.layers) {
        assertIdentifier(layer.id, "invalid_layer_id");
        if (layerIds.has(layer.id)) throw new Error("duplicate_layer");
        validateMetadata(layer.metadata, "layer_metadata_required");
        for (const role of layer.activityCompatibility ?? []) {
            if (!ROLE_PATTERN.test(role))
                throw new Error("invalid_activity_role");
        }
        for (const vein of layer.interestVeins ?? []) {
            if (!ROLE_PATTERN.test(vein))
                throw new Error("invalid_interest_vein");
        }
        layerIds.add(layer.id);
    }
    for (const layer of schema.layers) {
        const fieldIds = new Set<string>();
        for (const field of layer.fields ?? []) validateField(field, fieldIds);
        for (const fieldId of layer.detail?.fieldOrder ?? []) {
            if (!fieldIds.has(fieldId))
                throw new Error("detail_field_not_found");
        }
        if (layer.detail?.titleField && !fieldIds.has(layer.detail.titleField))
            throw new Error("detail_title_field_not_found");
        if (layer.strokeAsset) {
            const field = (layer.fields ?? []).find(
                ({ id }) => id === layer.strokeAsset!.field,
            );
            if (field?.type !== "asset")
                throw new Error("stroke_asset_field_not_found");
        }
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
        if (value === undefined) continue;
        const valid =
            (field.type === "integer" && Number.isSafeInteger(value)) ||
            (field.type === "number" &&
                typeof value === "number" &&
                Number.isFinite(value)) ||
            ((field.type === "string" || field.type === "asset") &&
                typeof value === "string") ||
            (field.type === "boolean" && typeof value === "boolean") ||
            (field.type === "stringList" &&
                Array.isArray(value) &&
                value.every((item) => typeof item === "string")) ||
            (field.type === "localizedText" &&
                (() => {
                    try {
                        validateLocalizedText(
                            value,
                            `invalid_field_type:${field.id}`,
                        );
                        return true;
                    } catch {
                        return false;
                    }
                })());
        if (!valid) throw new Error(`invalid_field_type:${field.id}`);
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
        if (
            !relationship.ordered &&
            matching.some(({ position }) => position !== undefined)
        )
            throw new Error(`relationship_not_ordered:${relationship.id}`);
        if (relationship.ordered) {
            const positions = matching.map(({ position }) => position);
            if (
                positions.some(
                    (position) =>
                        !Number.isSafeInteger(position) || position! < 0,
                )
            )
                throw new Error(
                    `relationship_position_required:${relationship.id}`,
                );
            if (new Set(positions).size !== positions.length)
                throw new Error(
                    `relationship_position_duplicate:${relationship.id}`,
                );
        }
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
        .filter(
            ({ resolverRole }) => resolverRole && resolverRole !== "explicit",
        )
        .map((relationship) => {
            const available = candidates.filter(
                (entry) =>
                    entry.schemaId === schema.id &&
                    entry.schemaVersion === schema.version &&
                    entry.layer === relationship.targetLayer,
            );
            const units =
                relationship.resolverRole === "grapheme"
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
                resolver: relationship.resolverRole!,
                deterministic: unresolved.length === 0,
            };
        });
}
