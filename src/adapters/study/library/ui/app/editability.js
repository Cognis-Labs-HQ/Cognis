export function entryEditMode(entry) {
    if (entry.canEdit !== true) return null;
    return entry.editRequiresReview === true ? "request" : "direct";
}
