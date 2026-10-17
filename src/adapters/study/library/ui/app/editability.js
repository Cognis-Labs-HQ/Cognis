export function entryEditMode(entry) {
    if (entry.canEdit !== true) return null;
    return entry.editRequiresReview === true ? "request" : "direct";
}

export function canCreateLayerEntries(layer) {
    return (
        Boolean(layer) &&
        !["atomicWritingUnit", "particle", "definition", "meaning"].includes(
            layer.semanticRole,
        )
    );
}

export function popupEntryEditMode(entry, initialEntry, options) {
    if (options.readOnly || (options.editDraft && entry.id !== initialEntry.id))
        return null;
    return options.editDraft ? "direct" : entryEditMode(entry);
}
