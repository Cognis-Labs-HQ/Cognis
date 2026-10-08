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
    let unresolved = false;
    const references = (suggestion.references ?? []).flatMap((reference) => {
        const resolved = resolve(reference);
        if (!resolved) unresolved = true;
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
            unresolved = true;
            continue;
        }
        referenceGroups[relation] = resolved;
    }
    return {
        suggestion: { ...suggestion, references, referenceGroups },
        unresolved,
    };
}
