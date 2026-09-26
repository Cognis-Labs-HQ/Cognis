/** Collapse visually identical relationship targets while preserving priority order. */
export function uniqueRelatedEntries(entries) {
    const labels = new Set();
    return entries.filter((entry) => {
        const key = String(entry.label).trim().normalize("NFC");
        if (labels.has(key)) return false;
        labels.add(key);
        return true;
    });
}
