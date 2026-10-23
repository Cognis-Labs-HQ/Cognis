import { resolveSegments } from "../reuse/segments.js";

function layerCandidates(entries, schema, layerId) {
    return entries.filter(
        (entry) =>
            entry.schemaId === schema.id &&
            entry.layer === layerId &&
            (entry.schemaVersion ?? schema.version) <= schema.version,
    );
}

function resolvePronunciation(value, candidates, relation) {
    const label = value.trim().normalize("NFKC");
    const ordered = candidates
        .filter(({ label }) => label?.trim())
        .toSorted((left, right) => right.label.length - left.label.length);
    return resolveSegments(label, ordered, ({ label }) =>
        label.trim().normalize("NFKC"),
    ).map((entry, position) => ({
        entryId: entry.id,
        relation,
        position,
    }));
}

function characterComposition(
    suggestion,
    entries,
    schema,
    layer,
    inputCarouselIds,
) {
    const relationships = (layer.relationships ?? []).filter(
        (relationship) =>
            inputCarouselIds.has(relationship.id) &&
            ["atomicWritingUnit", "compoundWritingUnit"].includes(
                schema.layers?.find(({ id }) => id === relationship.targetLayer)
                    ?.semanticRole,
            ),
    );
    if (
        (suggestion.references ?? []).some(({ relation }) =>
            inputCarouselIds.has(relation),
        )
    )
        return [];
    const candidates = relationships
        .flatMap((relationship) =>
            layerCandidates(entries, schema, relationship.targetLayer)
                .filter((entry) => entry.label?.trim())
                .map((entry) => ({ ...entry, relation: relationship.id })),
        )
        .toSorted(
            (left, right) =>
                right.label.normalize("NFKC").length -
                left.label.normalize("NFKC").length,
        );
    return resolveSegments(
        String(suggestion.label ?? "")
            .trim()
            .normalize("NFKC"),
        candidates,
        ({ label }) => label.trim().normalize("NFKC"),
    ).map(({ id, relation }, position) => ({
        entryId: id,
        relation,
        position,
    }));
}

export function resolveLookupReferences(
    suggestion,
    entries,
    schema,
    layer,
    inputCarouselIds = new Set(),
) {
    const resolve = (reference) => {
        const relationship = layer.relationships?.find(
            ({ id }) => id === reference.relation,
        );
        if (!relationship) return null;
        const linked = suggestion.linkedEntries?.find(
            ({ key }) => key === reference.entryId,
        );
        if (linked?.entry.layer === relationship.targetLayer) return reference;
        const candidates = layerCandidates(
            entries,
            schema,
            relationship.targetLayer,
        );
        const direct = candidates.find(({ id }) => id === reference.entryId);
        const matching = direct
            ? [direct]
            : candidates.filter(
                  ({ sourceRecordId }) => sourceRecordId === reference.entryId,
              );
        return matching.length === 1
            ? { ...reference, entryId: matching[0].id }
            : null;
    };
    const unresolvedRelations = new Set();
    const references = (suggestion.references ?? []).flatMap((reference) => {
        const relationship = layer.relationships?.find(
            ({ id }) => id === reference.relation,
        );
        const target = schema.layers?.find(
            ({ id }) => id === relationship?.targetLayer,
        );
        if (
            suggestion.definitions?.length &&
            target?.semanticRole === "definition"
        )
            return [];
        const resolved = resolve(reference);
        if (!resolved) unresolvedRelations.add(reference.relation);
        return resolved ? [resolved] : [];
    });
    references.push(
        ...characterComposition(
            suggestion,
            entries,
            schema,
            layer,
            inputCarouselIds,
        ),
    );
    const referenceGroups = {};
    for (const [relation, groups] of Object.entries(
        suggestion.referenceGroups ?? {},
    )) {
        const resolved = groups.map((group) =>
            group.map((reference) => resolve({ ...reference, relation })),
        );
        // Groups align with pronunciations: never shift or partially reconstruct a reading.
        if (
            resolved.some(
                (group) =>
                    !group.length || group.some((reference) => !reference),
            )
        ) {
            unresolvedRelations.add(relation);
            continue;
        }
        referenceGroups[relation] = resolved;
    }
    const raw = suggestion.fields?.pronunciation;
    const pronunciations = (Array.isArray(raw) ? raw : [raw]).filter(
        (value) => typeof value === "string" && value.trim(),
    );
    const hasPronunciationGroups = (layer.relationships ?? []).some(
        ({ id, presentationRole }) =>
            presentationRole === "pronunciation" && referenceGroups[id]?.length,
    );
    for (const relationship of layer.relationships ?? []) {
        const target = schema.layers?.find(
            ({ id }) => id === relationship.targetLayer,
        );
        if (
            hasPronunciationGroups ||
            !relationship.grouped ||
            relationship.presentationRole !== "pronunciation" ||
            target?.semanticRole !== "atomicWritingUnit"
        )
            continue;
        const candidates = layerCandidates(entries, schema, target.id);
        const groups = pronunciations.map((value) =>
            resolvePronunciation(value, candidates, relationship.id),
        );
        if (groups.length && groups.every((group) => group.length)) {
            referenceGroups[relationship.id] = groups;
            unresolvedRelations.delete(relationship.id);
        } else if (groups.length && !referenceGroups[relationship.id]?.length)
            unresolvedRelations.add(relationship.id);
    }
    const linkedEntries = suggestion.linkedEntries?.map(({ key, entry }) => {
        const targetLayer = schema.layers.find(({ id }) => id === entry.layer);
        const rootReferences = (entry.references ?? []).filter(
            ({ entryId }) => entryId === "$root",
        );
        const child = resolveLookupReferences(
            {
                ...entry,
                references: (entry.references ?? []).filter(
                    ({ entryId }) => entryId !== "$root",
                ),
            },
            entries,
            schema,
            targetLayer,
        );
        if (child.unresolved) unresolvedRelations.add(key);
        return {
            key,
            entry: {
                ...entry,
                references: [...child.suggestion.references, ...rootReferences],
                referenceGroups: child.suggestion.referenceGroups,
            },
        };
    });
    return {
        suggestion: {
            ...suggestion,
            references,
            referenceGroups,
            linkedEntries,
        },
        unresolved: unresolvedRelations.size > 0,
    };
}
