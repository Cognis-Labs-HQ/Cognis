import type {
    LibraryEntry,
    LibraryFieldSchema,
    LibraryMetadataValue,
    LibraryReferenceInput,
    LibraryRelationshipSchema,
    LibraryResolutionProposal,
    LibrarySchema,
} from "./types.js";
import { canonicalizeLanguageTag } from "./language.js";

const ID_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const CONTENT_RECORD_ID_PATTERN = /^[a-z0-9]+(?:[-_.:][a-z0-9]+)*$/i;
const ROLE_PATTERN = /^[a-z][a-zA-Z0-9]*(?::[a-z][a-zA-Z0-9]*)*$/;
const BUILT_IN_FIELD_TYPES = new Set([
    "string",
    "number",
    "integer",
    "boolean",
    "localizedText",
    "stringList",
    "asset",
    "assetList",
    "audio",
    "audioList",
    "strokePattern",
]);

function validateStrokePattern(value: unknown): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const pattern = value as {
        coordinateSystem?: unknown;
        tolerance?: unknown;
        strokes?: unknown;
    };
    if (pattern.coordinateSystem !== "normalized") return false;
    if (
        pattern.tolerance !== undefined &&
        (typeof pattern.tolerance !== "number" ||
            !Number.isFinite(pattern.tolerance) ||
            pattern.tolerance < 0 ||
            pattern.tolerance > 100)
    )
        return false;
    if (!Array.isArray(pattern.strokes) || !pattern.strokes.length)
        return false;
    return pattern.strokes.every((stroke) => {
        if (!stroke || typeof stroke !== "object") return false;
        const points = (stroke as { points?: unknown }).points;
        if (!Array.isArray(points) || points.length < 2) return false;
        let previousTime = -1;
        return points.every((point) => {
            if (!point || typeof point !== "object") return false;
            const candidate = point as Record<string, unknown>;
            const valid =
                typeof candidate.x === "number" &&
                Number.isFinite(candidate.x) &&
                candidate.x >= 0 &&
                candidate.x <= 1 &&
                typeof candidate.y === "number" &&
                Number.isFinite(candidate.y) &&
                candidate.y >= 0 &&
                candidate.y <= 1 &&
                typeof candidate.time === "number" &&
                Number.isFinite(candidate.time) &&
                candidate.time >= previousTime &&
                (candidate.pressure === undefined ||
                    (typeof candidate.pressure === "number" &&
                        Number.isFinite(candidate.pressure) &&
                        candidate.pressure >= 0 &&
                        candidate.pressure <= 1));
            if (valid) previousTime = candidate.time as number;
            return valid;
        });
    });
}

export function validateLibraryMetadataValue(
    value: unknown,
): asserts value is LibraryMetadataValue {
    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean"
    )
        return;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("invalid_metadata_value");
        return;
    }
    if (Array.isArray(value)) {
        value.forEach(validateLibraryMetadataValue);
        return;
    }
    if (!value || typeof value !== "object")
        throw new Error("invalid_metadata_value");
    for (const [key, item] of Object.entries(
        value as Record<string, unknown>,
    )) {
        if (!key.trim() || item === undefined)
            throw new Error("invalid_metadata_value");
        validateLibraryMetadataValue(item);
    }
}

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
    for (const [key, value] of Object.entries(metadata)) {
        if (key !== "labels" && key !== "descriptions")
            validateLibraryMetadataValue(value);
    }
}

function assertIdentifier(value: string, code: string): void {
    if (!ID_PATTERN.test(value)) throw new Error(code);
}

function validateField(field: LibraryFieldSchema, ids: Set<string>): void {
    assertIdentifier(field.id, "invalid_field_id");
    if (ids.has(field.id)) throw new Error("duplicate_field");
    validateMetadata(field.metadata, "field_metadata_required");
    if (!field.type?.trim()) throw new Error("invalid_field_type");
    if (!BUILT_IN_FIELD_TYPES.has(field.type) && !field.validation)
        throw new Error("custom_field_validation_required");
    if (field.validation) validateFieldValidation(field.validation);
    if (
        field.detail?.exclusive !== undefined &&
        typeof field.detail.exclusive !== "boolean"
    )
        throw new Error("invalid_filter_group_exclusivity");
    if (
        field.detail?.required !== undefined &&
        typeof field.detail.required !== "boolean"
    )
        throw new Error("invalid_filter_group_requirement");
    if (
        field.detail?.filterable !== undefined &&
        typeof field.detail.filterable !== "boolean"
    )
        throw new Error("invalid_filterable_field");
    if (
        field.detail?.defaultTag !== undefined &&
        (typeof field.detail.defaultTag !== "string" ||
            !field.detail.defaultTag.trim())
    )
        throw new Error("invalid_filter_group_default_tag");
    ids.add(field.id);
}

function validateFieldValidation(
    validation: NonNullable<LibraryFieldSchema["validation"]>,
): void {
    if (!validation || typeof validation !== "object")
        throw new Error("invalid_field_validation");
    if (validation.kind === "string") {
        if (validation.pattern !== undefined) {
            if (typeof validation.pattern !== "string")
                throw new Error("invalid_field_validation");
            try {
                new RegExp(validation.pattern, "u");
            } catch {
                throw new Error("invalid_field_validation");
            }
        }
        return;
    }
    if (validation.kind === "number") {
        if (
            validation.integer !== undefined &&
            typeof validation.integer !== "boolean"
        )
            throw new Error("invalid_field_validation");
        for (const value of [validation.minimum, validation.maximum])
            if (
                value !== undefined &&
                (typeof value !== "number" || !Number.isFinite(value))
            )
                throw new Error("invalid_field_validation");
        if (
            validation.minimum !== undefined &&
            validation.maximum !== undefined &&
            validation.minimum > validation.maximum
        )
            throw new Error("invalid_field_validation");
        return;
    }
    if (validation.kind === "boolean" || validation.kind === "localizedText")
        return;
    if (
        validation.kind === "list" &&
        ["string", "number", "boolean"].includes(validation.items)
    )
        return;
    throw new Error("invalid_field_validation");
}

function validateFilterGroups(fields: readonly LibraryFieldSchema[]): void {
    const groupSettings = new Map<
        string,
        { exclusive: boolean; required: boolean; defaultTag?: string }
    >();
    for (const field of fields) {
        if (
            !field.detail?.group &&
            field.detail?.exclusive === undefined &&
            field.detail?.required === undefined &&
            field.detail?.defaultTag === undefined
        )
            continue;
        const groupId = field.detail.group ?? field.id;
        const exclusive = field.detail.exclusive ?? false;
        const required = field.detail.required ?? false;
        const defaultTag = field.detail.defaultTag?.trim();
        const established = groupSettings.get(groupId);
        if (established) {
            if (established.exclusive !== exclusive)
                throw new Error("inconsistent_filter_group_exclusivity");
            if (established.required !== required)
                throw new Error("inconsistent_filter_group_requirement");
            if (
                established.defaultTag &&
                defaultTag &&
                established.defaultTag !== defaultTag
            )
                throw new Error("multiple_filter_group_defaults");
            if (!established.defaultTag && defaultTag)
                established.defaultTag = defaultTag;
            continue;
        }
        groupSettings.set(groupId, { exclusive, required, defaultTag });
    }
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
    if (!["restrict", "detach", "cascade"].includes(relationship.onDelete))
        throw new Error("invalid_deletion_behavior");
    if (
        relationship.variant !== undefined &&
        typeof relationship.variant !== "boolean"
    )
        throw new Error("invalid_variant_relationship");
    if (
        relationship.child !== undefined &&
        typeof relationship.child !== "boolean"
    )
        throw new Error("invalid_child_relationship");
    if (
        relationship.presentationRole !== undefined &&
        !["composition", "alternateSpelling", "pronunciation"].includes(
            relationship.presentationRole,
        )
    )
        throw new Error("invalid_relationship_presentation_role");
    ids.add(relationship.id);
}

export function validateLibrarySchema(schema: LibrarySchema): LibrarySchema {
    schema = structuredClone(schema);
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
        if (
            layer.displayDefinition !== undefined &&
            typeof layer.displayDefinition !== "boolean"
        )
            throw new Error("invalid_display_definition");
        if (layer.minimal !== undefined && typeof layer.minimal !== "boolean")
            throw new Error("invalid_minimal_layer");
        if (layer.grid) {
            if (
                !Number.isSafeInteger(layer.grid.rowSize) ||
                layer.grid.rowSize < 1 ||
                layer.grid.rowSize > 24 ||
                !Array.isArray(layer.grid.items)
            ) {
                throw new Error("invalid_layer_grid");
            }
            const itemIds = layer.grid.items.filter(
                (item): item is string | number =>
                    typeof item === "string" || typeof item === "number",
            );
            if (
                layer.grid.items.some(
                    (item) =>
                        item !== null &&
                        typeof item !== "string" &&
                        typeof item !== "number" &&
                        (typeof item !== "object" || item.blank !== true),
                ) ||
                itemIds.some((item) =>
                    typeof item === "string"
                        ? !CONTENT_RECORD_ID_PATTERN.test(item)
                        : !Number.isSafeInteger(item) || item < 0,
                ) ||
                new Set(itemIds.map(String)).size !== itemIds.length
            ) {
                throw new Error("invalid_layer_grid_items");
            }
        }
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
        validateFilterGroups(layer.fields ?? []);
        for (const fieldId of layer.detail?.fieldOrder ?? []) {
            if (!fieldIds.has(fieldId))
                throw new Error("detail_field_not_found");
        }
        if (layer.detail?.titleField && !fieldIds.has(layer.detail.titleField))
            throw new Error("detail_title_field_not_found");
        if (layer.cardConstructor) {
            validateMetadata(
                layer.cardConstructor.label,
                "constructor_label_required",
            );
            const constructorFields = layer.cardConstructor.fields ?? [];
            if (
                new Set(constructorFields).size !== constructorFields.length ||
                constructorFields.some((fieldId) => !fieldIds.has(fieldId))
            )
                throw new Error("constructor_field_not_found");
            const relationshipIds = new Set(
                (layer.relationships ?? []).map(({ id }) => id),
            );
            const constructorRelationships =
                layer.cardConstructor.relationships ?? [];
            if (
                !Array.isArray(layer.cardConstructor.input_carousels) ||
                !Array.isArray(layer.cardConstructor.pronunciation_carousels)
            )
                throw new Error("constructor_carousels_required");
            if (
                new Set(constructorRelationships).size !==
                    constructorRelationships.length ||
                constructorRelationships.some(
                    (relationshipId) => !relationshipIds.has(relationshipId),
                )
            )
                throw new Error("constructor_relationship_not_found");
            for (const carouselIds of [
                layer.cardConstructor.input_carousels ?? [],
                layer.cardConstructor.pronunciation_carousels ?? [],
            ]) {
                if (
                    new Set(carouselIds).size !== carouselIds.length ||
                    carouselIds.some(
                        (relationshipId) =>
                            !relationshipIds.has(relationshipId) ||
                            !constructorRelationships.includes(relationshipId),
                    )
                )
                    throw new Error("constructor_carousel_not_found");
            }
            const defaultIds = Object.keys(
                layer.cardConstructor.defaults ?? {},
            );
            if (defaultIds.some((fieldId) => !fieldIds.has(fieldId)))
                throw new Error("constructor_default_field_not_found");
            for (const option of [
                layer.cardConstructor.allowAlwaysShowDefinition,
                layer.cardConstructor.allowHidden,
            ]) {
                if (option !== undefined && typeof option !== "boolean")
                    throw new Error("invalid_constructor_option");
            }
        }
        if (
            layer.semanticRole === "atomicWritingUnit" ||
            layer.semanticRole === "compoundWritingUnit"
        ) {
            const pronunciation = (layer.fields ?? []).find(
                ({ id }) => id === "pronunciation",
            );
            if (pronunciation?.type !== "stringList" || !pronunciation.required)
                throw new Error("pronunciation_field_required");
            const audio = (layer.fields ?? []).find(({ id }) => id === "audio");
            if (audio?.type !== "audio")
                throw new Error("audio_field_required");
        }
        if (layer.strokeAsset) {
            const field = (layer.fields ?? []).find(
                ({ id }) => id === layer.strokeAsset!.field,
            );
            if (field?.type !== "asset")
                throw new Error("stroke_asset_field_not_found");
        }
        if (
            ["lexicalUnit", "orderedLexicalSequence"].includes(
                layer.semanticRole ?? "",
            ) &&
            (layer.fields ?? []).some(({ type }) => type === "strokePattern")
        )
            throw new Error("stroke_pattern_writing_unit_required");
        if (layer.semanticRole === "definition") {
            const localization = layer.definitionLocalization;
            if (!localization)
                throw new Error("definition_localization_required");
            if (!ROLE_PATTERN.test(localization.stringKeyPrefix))
                throw new Error("invalid_definition_string_key_prefix");
            const stringKeyField = (layer.fields ?? []).find(
                ({ id }) => id === localization.stringKeyField,
            );
            const translationsField = (layer.fields ?? []).find(
                ({ id }) => id === localization.translationsField,
            );
            if (stringKeyField?.type !== "string")
                throw new Error("definition_string_key_field_required");
            if (translationsField?.type !== "localizedText")
                throw new Error("definition_translations_field_required");
        } else if (layer.definitionLocalization) {
            throw new Error("definition_localization_role_required");
        }
        const relationshipIds = new Set<string>();
        for (const relationship of layer.relationships ?? []) {
            validateRelationship(relationship, layerIds, relationshipIds);
        }
        for (const field of layer.fields ?? []) {
            const links = field.input?.linkRelationships;
            if (links === undefined) continue;
            if (
                !Array.isArray(links) ||
                !links.length ||
                new Set(links).size !== links.length ||
                links.some(
                    (relationshipId) =>
                        typeof relationshipId !== "string" ||
                        !relationshipIds.has(relationshipId),
                )
            )
                throw new Error("field_link_relationship_not_found");
        }
        if (layer.displayDefinition) {
            if (
                layer.semanticRole === "atomicWritingUnit" ||
                layer.semanticRole === "definition" ||
                layer.semanticRole === "meaning"
            )
                throw new Error("display_definition_not_supported");
            const hasDefinitionRelationship = (layer.relationships ?? []).some(
                (relationship) => {
                    const target = schema.layers.find(
                        ({ id }) => id === relationship.targetLayer,
                    );
                    return target &&
                        (target.semanticRole === "definition" ||
                            target.semanticRole === "meaning")
                        ? (relationship.minimum ?? 0) >= 1
                        : false;
                },
            );
            if (!hasDefinitionRelationship)
                throw new Error("display_definition_relationship_required");
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
        if (
            field.required &&
            field.type !== "audio" &&
            (value === undefined || value === "")
        )
            throw new Error(`field_required:${field.id}`);
        if (value === undefined) continue;
        const builtInValid =
            (field.type === "integer" && Number.isSafeInteger(value)) ||
            (field.type === "number" &&
                typeof value === "number" &&
                Number.isFinite(value)) ||
            ((field.type === "string" ||
                field.type === "asset" ||
                field.type === "audio") &&
                typeof value === "string") ||
            (field.type === "boolean" && typeof value === "boolean") ||
            (field.type === "stringList" &&
                Array.isArray(value) &&
                value.every((item) => typeof item === "string")) ||
            ((field.type === "assetList" || field.type === "audioList") &&
                Array.isArray(value) &&
                value.every(
                    (item) => typeof item === "string" && item.length > 0,
                )) ||
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
                })()) ||
            (field.type === "strokePattern" && validateStrokePattern(value));
        const valid = BUILT_IN_FIELD_TYPES.has(field.type)
            ? builtInValid &&
              (!field.validation || validateFieldValue(field.validation, value))
            : field.validation !== undefined &&
              validateFieldValue(field.validation, value);
        if (!valid) throw new Error(`invalid_field_type:${field.id}`);
    }
}

function validateFieldValue(
    validation: NonNullable<LibraryFieldSchema["validation"]>,
    value: unknown,
): boolean {
    if (validation.kind === "string")
        return (
            typeof value === "string" &&
            (!validation.pattern ||
                new RegExp(validation.pattern, "u").test(value))
        );
    if (validation.kind === "boolean") return typeof value === "boolean";
    if (validation.kind === "localizedText") {
        try {
            validateLocalizedText(value, "invalid");
            return true;
        } catch {
            return false;
        }
    }
    if (validation.kind === "number")
        return (
            typeof value === "number" &&
            Number.isFinite(value) &&
            (!validation.integer || Number.isSafeInteger(value)) &&
            (validation.minimum === undefined || value >= validation.minimum) &&
            (validation.maximum === undefined || value <= validation.maximum)
        );
    return (
        validation.kind === "list" &&
        Array.isArray(value) &&
        value.every((item) =>
            validation.items === "number"
                ? typeof item === "number" && Number.isFinite(item)
                : typeof item === validation.items,
        )
    );
}

export function validateReferences(
    schema: LibrarySchema,
    layerId: string,
    references: readonly LibraryReferenceInput[],
    targets: ReadonlyMap<string, LibraryEntry>,
): void {
    const layer = findLayer(schema, layerId);
    const relationships = new Map(
        (layer.relationships ?? []).map((item) => [item.id, item]),
    );
    const requiredPronunciationRelationships = new Set(
        layer.cardConstructor?.pronunciation_carousels ?? [],
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
        const minimum =
            layer.semanticRole === "compoundWritingUnit" &&
            layer.cardConstructor &&
            !requiredPronunciationRelationships.has(relationship.id)
                ? 0
                : (relationship.minimum ?? 0);
        if (matching.length < minimum)
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
