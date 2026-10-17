/** Follow committed or proposed reading links to the atomic Kana for a saved pronunciation. */
export function pronunciationComponents(form, value, index, entries, schema) {
    const records = new Map(entries.map((entry) => [entry.id, entry]));
    for (const { key, entry } of form.libraryLinkedEntries ?? [])
        records.set(key, entry);
    const expand = (reference, path = new Set()) => {
        if (path.has(reference.entryId)) return [];
        const entry = records.get(reference.entryId);
        if (!entry) return [];
        const layer = schema.layers.find(({ id }) => id === entry.layer);
        if (layer?.semanticRole === "atomicWritingUnit")
            return [{ id: reference.entryId, label: entry.label }];
        const next = new Set([...path, reference.entryId]);
        const relationships = (layer?.relationships ?? []).filter(
            (relationship) =>
                relationship.presentationRole === "pronunciation" ||
                schema.layers.find(({ id }) => id === relationship.targetLayer)
                    ?.semanticRole === "atomicWritingUnit",
        );
        for (const relationship of relationships) {
            const grouped = entry.referenceGroups?.[relationship.id]?.[0];
            const references =
                grouped ??
                (entry.references ?? []).filter(
                    ({ relation }) => relation === relationship.id,
                );
            const components = references.flatMap((reference) =>
                expand(reference, next),
            );
            if (components.length) return components;
        }
        return [];
    };
    for (const groups of Object.values(form.referenceGroups ?? {})) {
        const components = (groups[index] ?? []).flatMap((reference) =>
            expand(reference),
        );
        if (
            components
                .map(({ label }) => label)
                .join("")
                .normalize("NFKC") === value.normalize("NFKC")
        )
            return components;
    }
    return [];
}
