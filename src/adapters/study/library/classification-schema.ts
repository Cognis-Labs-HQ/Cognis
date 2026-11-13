import type { LibraryLayerSchema, LibrarySchema } from "./types.js";

/** Validate provider-owned classification presentation and reference ranking. */
export function validateClassifications(
    layer: LibraryLayerSchema,
    schema: LibrarySchema,
    validateMetadata: (
        metadata: { labels: Record<string, string> },
        code: string,
    ) => void,
): void {
    if (layer.detail?.tags !== undefined && !Array.isArray(layer.detail.tags))
        throw new Error("invalid_display_tag");
    const tags = new Set<string>();
    for (const tag of layer.detail?.tags ?? []) {
        if (
            !tag ||
            typeof tag !== "object" ||
            typeof tag.value !== "string" ||
            !tag.value.trim() ||
            tags.has(tag.value) ||
            (tag.filterable !== undefined &&
                typeof tag.filterable !== "boolean")
        )
            throw new Error("invalid_display_tag");
        tags.add(tag.value);
        validateMetadata(tag.metadata, "display_tag_metadata_required");
    }
    for (const field of layer.fields ?? []) {
        if (
            field.detail?.autoSelectSingle !== undefined &&
            typeof field.detail.autoSelectSingle !== "boolean"
        )
            throw new Error("invalid_filter_single_selection");
        const derivation = field.derivation;
        if (derivation === undefined) continue;
        if (
            !derivation ||
            typeof derivation !== "object" ||
            Array.isArray(derivation)
        )
            throw new Error("invalid_field_derivation");
        if (
            field.type !== "string" ||
            derivation.kind !== "rankedReferences" ||
            typeof derivation.requireAll !== "boolean" ||
            !Array.isArray(derivation.values) ||
            !derivation.values.length ||
            derivation.values.some(
                (value) => typeof value !== "string" || !value.trim(),
            ) ||
            new Set(derivation.values).size !== derivation.values.length ||
            !Array.isArray(derivation.relationships) ||
            !derivation.relationships.length ||
            new Set(derivation.relationships).size !==
                derivation.relationships.length ||
            derivation.relationships.some((id) => {
                const relationship = layer.relationships?.find(
                    (relation) => relation.id === id,
                );
                const target = schema.layers.find(
                    (candidate) => candidate.id === relationship?.targetLayer,
                );
                return !target?.fields?.some(
                    (candidate) =>
                        candidate.id === field.id &&
                        candidate.type === "string",
                );
            })
        )
            throw new Error("invalid_field_derivation");
        if (
            derivation.transformationValues !== undefined &&
            (!derivation.transformationValues ||
                Array.isArray(derivation.transformationValues) ||
                typeof derivation.transformationValues !== "object" ||
                Object.entries(derivation.transformationValues).some(
                    ([ruleId, value]) =>
                        !derivation.values?.includes(value) ||
                        !schema.transformSets?.some((set) =>
                            set.rules.some((rule) => rule.id === ruleId),
                        ),
                ))
        )
            throw new Error("invalid_field_derivation");
    }
}
