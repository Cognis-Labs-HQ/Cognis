export function mergeEntryCollectionUpdate(entries, update) {
    if (Array.isArray(update)) return update;
    if (!update?.id) return entries;
    let matched = false;
    const merged = entries.map((entry) => {
        if (entry.id !== update.id) return entry;
        matched = true;
        Object.assign(entry, update);
        return entry;
    });
    return matched ? merged : [...merged, update];
}
