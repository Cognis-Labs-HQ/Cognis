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
    const derivesPronunciation =
        layer?.semanticRole === "orderedLexicalSequence";
    const prepopulatesPronunciation = layer?.semanticRole === "lexicalUnit";
    const constructorFieldIds = new Set(effectiveConstructor.fields ?? []);
    if (
        ["compoundWritingUnit", "lexicalUnit"].includes(layer?.semanticRole) &&
        fieldsById.has("pronunciation")
    )
        constructorFieldIds.add("pronunciation");
    if (
        (derivesPronunciation || prepopulatesPronunciation) &&
        fieldsById.get("audio")?.type === "audio"
    )
        constructorFieldIds.add("audio");
    const fields = Array.from(constructorFieldIds)
        .map((fieldId) => fieldsById.get(fieldId))
        .filter(
            (field) =>
                field &&
                !(derivesPronunciation && field.id === "pronunciation"),
        );
    const inputCarouselLayers = new Set(
        effectiveConstructor.input_carousels ?? [],
    );
    const pronunciationCarouselLayers = new Set(
        effectiveConstructor.pronunciation_carousels ?? [],
    );
    const layerIdsForRoles = (...roles) =>
        (schema?.layers ?? [])
            .filter(({ semanticRole }) => roles.includes(semanticRole))
            .map(({ id }) => id);
    if (layer?.semanticRole === "compoundWritingUnit") {
        inputCarouselLayers.clear();
    } else if (layer?.semanticRole === "lexicalUnit") {
        inputCarouselLayers.clear();
        pronunciationCarouselLayers.clear();
        layerIdsForRoles(
            "atomicWritingUnit",
            "compoundWritingUnit",
            "lexicalUnit",
        ).forEach((id) => inputCarouselLayers.add(id));
        layerIdsForRoles("atomicWritingUnit").forEach((id) =>
            pronunciationCarouselLayers.add(id),
        );
    } else if (layer?.semanticRole === "orderedLexicalSequence") {
        inputCarouselLayers.clear();
        pronunciationCarouselLayers.clear();
        layerIdsForRoles(
            "particle",
            "compoundWritingUnit",
            "lexicalUnit",
        ).forEach((id) => inputCarouselLayers.add(id));
    }
    if (
        constructorFieldIds.has("pronunciation") &&
        pronunciationCarouselLayers.size === 0
    ) {
        const pronunciationRelationships = (layer?.relationships ?? []).filter(
            (relationship) => relationship.presentationRole === "pronunciation",
        );
        const fallbackRelationships =
            pronunciationRelationships.length > 0
                ? pronunciationRelationships
                : (layer?.relationships ?? []).filter((relationship) => {
                      const target = schema?.layers?.find(
                          ({ id }) => id === relationship.targetLayer,
                      );
                      return (
                          layer?.semanticRole === "compoundWritingUnit" &&
                          target?.semanticRole === "atomicWritingUnit"
                      );
                  });
        for (const relationship of fallbackRelationships)
            pronunciationCarouselLayers.add(relationship.targetLayer);
    }
    const constructorRelationshipIds = new Set(
        effectiveConstructor.relationships ?? [],
    );
    for (const relationship of layer?.relationships ?? []) {
        const targetLayer = schema?.layers?.find(
            ({ id }) => id === relationship.targetLayer,
        );
        const configuredForPronunciation =
            pronunciationCarouselLayers.has(relationship.targetLayer) &&
            (relationship.presentationRole === "pronunciation" ||
                layer?.semanticRole === "compoundWritingUnit");
        const configuredForInput =
            relationship.presentationRole !== "pronunciation" &&
            inputCarouselLayers.has(relationship.targetLayer);
        if (configuredForPronunciation || configuredForInput)
            constructorRelationshipIds.add(relationship.id);
    }
    const relationships = Array.from(constructorRelationshipIds)
        .map((relationshipId) => relationshipsById.get(relationshipId))
        .filter(Boolean);
    const inputCarouselIds = new Set(
        relationships
            .filter(
                ({ targetLayer, presentationRole }) =>
                    presentationRole !== "pronunciation" &&
                    inputCarouselLayers.has(targetLayer),
            )
            .map(({ id }) => id),
    );
    if (layer?.semanticRole === "lexicalUnit") {
        for (const targetLayer of inputCarouselLayers) {
            const hasInputCarousel = Array.from(inputCarouselIds).some(
                (id) => relationshipsById.get(id)?.targetLayer === targetLayer,
            );
            if (hasInputCarousel) continue;
            const target = schema?.layers?.find(({ id }) => id === targetLayer);
            if (target?.semanticRole !== "atomicWritingUnit") continue;
            const characterRelationship = relationships.find(
                (relationship) => relationship.targetLayer === targetLayer,
            );
            if (characterRelationship)
                inputCarouselIds.add(characterRelationship.id);
        }
    }
    return {
        constructor: effectiveConstructor,
        layer: { ...layer, fields, relationships },
        inputCarouselIds,
        pronunciationCarouselLayers,
        derivesPronunciation,
        prepopulatesPronunciation,
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
    if (direct) return direct;
    if (["atomicWritingUnit", "particle"].includes(entryLayer?.semanticRole))
        return entry.label;
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
    return parts.join("");
}

export function applyDerivedPronunciation(
    fields,
    references,
    entries,
    schema,
    layer,
    derivesPronunciation,
) {
    if (!derivesPronunciation) return fields;
    const draft = { fields, references };
    const pronunciation = derivedPronunciation(draft, entries, schema);
    const providerLayer = schema?.layers?.find(({ id }) => id === layer?.id);
    const pronunciationField = (providerLayer ?? layer)?.fields?.find(
        ({ id }) => id === "pronunciation",
    );
    if (!pronunciationField) return fields;
    if (
        pronunciationField.multi_value === true &&
        Array.isArray(fields.pronunciation) &&
        fields.pronunciation.some((value) => String(value).trim())
    )
        return fields;
    fields.pronunciation =
        pronunciationField.type === "stringList" ||
        pronunciationField.validation?.kind === "list"
            ? pronunciation
                ? [pronunciation]
                : []
            : pronunciation;
    return fields;
}
