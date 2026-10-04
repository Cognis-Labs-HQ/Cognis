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
