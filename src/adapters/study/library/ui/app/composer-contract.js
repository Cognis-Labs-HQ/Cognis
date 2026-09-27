import { layerForEntry, pronunciationValues } from "./presentation.js";

export function resolveComposerContract(schema, layer, constructor) {
    const effectiveConstructor = constructor ?? {
        fields: (layer?.fields ?? []).map(({ id }) => id),
        relationships: (layer?.relationships ?? []).map(({ id }) => id),
        input_carousels: [],
        pronunciation_carousels: [],
        defaults: {},
    };
    const fieldsById = new Map(
        (layer?.fields ?? []).map((field) => [field.id, field]),
    );
    const relationshipsById = new Map(
        (layer?.relationships ?? []).map((relationship) => [
            relationship.id,
            relationship,
        ]),
    );
    const derivesPronunciation = [
        "lexicalUnit",
        "orderedLexicalSequence",
    ].includes(layer?.semanticRole);
    const fields = (effectiveConstructor.fields ?? [])
        .map((fieldId) => fieldsById.get(fieldId))
        .filter(
            (field) =>
                field &&
                !(derivesPronunciation && field.id === "pronunciation"),
        );
    const relationships = (effectiveConstructor.relationships ?? [])
        .map((relationshipId) => relationshipsById.get(relationshipId))
        .filter(Boolean);
    const inputCarouselLayers = new Set(
        effectiveConstructor.input_carousels ?? [],
    );
    const pronunciationCarouselLayers = new Set(
        effectiveConstructor.pronunciation_carousels ?? [],
    );
    const inputCarouselIds = new Set(
        relationships
            .filter(
                ({ targetLayer, presentationRole }) =>
                    presentationRole !== "pronunciation" &&
                    inputCarouselLayers.has(targetLayer),
            )
            .map(({ id }) => id),
    );
    return {
        constructor: effectiveConstructor,
        layer: { ...layer, fields, relationships },
        inputCarouselIds,
        pronunciationCarouselLayers,
        derivesPronunciation,
    };
}

export function derivedPronunciation(
    entry,
    entries,
    schema,
    visited = new Set(),
) {
    if (!entry || visited.has(entry.id)) return "";
    const path = new Set(visited);
    path.add(entry.id);
    const direct = pronunciationValues(entry).find(Boolean);
    const entryLayer = layerForEntry([schema], entry);
    if (entryLayer?.semanticRole === "atomicWritingUnit")
        return direct || entry.label;
    const parts = (entry.references ?? [])
        .slice()
        .sort(
            (left, right) =>
                (left.position ?? Number.MAX_SAFE_INTEGER) -
                (right.position ?? Number.MAX_SAFE_INTEGER),
        )
        .map(({ entryId }) => entries.find(({ id }) => id === entryId))
        .filter((candidate) => {
            const role = candidate
                ? layerForEntry([schema], candidate)?.semanticRole
                : undefined;
            return !["definition", "meaning"].includes(role);
        })
        .map((candidate) =>
            derivedPronunciation(candidate, entries, schema, path),
        )
        .filter(Boolean);
    return parts.join("") || direct || "";
}

export function applyDerivedPronunciation(
    fields,
    references,
    entries,
    schema,
    derivesPronunciation,
) {
    if (!derivesPronunciation) return fields;
    const draft = { fields, references };
    fields.pronunciation = derivedPronunciation(draft, entries, schema);
    return fields;
}
