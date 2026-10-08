function resolvePronunciation(value, candidates, relation) {
    const label = value.trim().normalize("NFKC");
    const ordered = candidates
        .filter(({ label }) => label?.trim())
        .toSorted((left, right) => right.label.length - left.label.length);
    const resolved = new Map([[label.length, []]]);
    for (let offset = label.length - 1; offset >= 0; offset -= 1) {
        for (const candidate of ordered) {
            const text = candidate.label.trim().normalize("NFKC");
            const tail = resolved.get(offset + text.length);
            if (tail && label.startsWith(text, offset)) {
                resolved.set(offset, [candidate, ...tail]);
                break;
            }
        }
    }
    return (resolved.get(0) ?? []).map((entry, position) => ({
        entryId: entry.id,
        relation,
        position,
    }));
}

export function resolveLookupReferences(suggestion, entries, schema, layer) {
    const resolve = (reference) => {
        const relationship = layer.relationships?.find(
            ({ id }) => id === reference.relation,
        );
        if (!relationship) return null;
        const candidates = entries.filter(
            (entry) =>
                entry.schemaId === schema.id &&
                entry.layer === relationship.targetLayer &&
                (entry.schemaVersion ?? schema.version) <= schema.version,
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
    for (const relationship of layer.relationships ?? []) {
        const target = schema.layers?.find(
            ({ id }) => id === relationship.targetLayer,
        );
        if (
            !relationship.grouped ||
            relationship.presentationRole !== "pronunciation" ||
            target?.semanticRole !== "atomicWritingUnit"
        )
            continue;
        const candidates = entries.filter(
            (entry) =>
                entry.schemaId === schema.id &&
                entry.layer === target.id &&
                (entry.schemaVersion ?? schema.version) <= schema.version,
        );
        const groups = pronunciations.map((value) =>
            resolvePronunciation(value, candidates, relationship.id),
        );
        if (groups.length && groups.every((group) => group.length)) {
            referenceGroups[relationship.id] = groups;
            unresolvedRelations.delete(relationship.id);
        } else if (groups.length && !referenceGroups[relationship.id]?.length)
            unresolvedRelations.add(relationship.id);
    }
    return {
        suggestion: { ...suggestion, references, referenceGroups },
        unresolved: unresolvedRelations.size > 0,
    };
}
