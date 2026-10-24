export function allEntryReferences(entry) {
    return [
        ...(entry.references ?? []),
        ...Object.values(entry.referenceGroups ?? {}).flat(2),
    ];
}

/** Resolve only the already-authorized snapshot; missing dependencies remain absent. */
export function cachedEntryDetail(entryId, entries) {
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    const entry = byId.get(entryId);
    if (!entry) throw new Error("offline_read_unavailable");
    return {
        entry,
        references: allEntryReferences(entry)
            .map((reference) => byId.get(reference.entryId))
            .filter(Boolean),
        usedBy: [...byId.values()].filter(
            (candidate) =>
                candidate.id !== entryId &&
                allEntryReferences(candidate).some(
                    (reference) => reference.entryId === entryId,
                ),
        ),
    };
}
