/** Resolve complete labels into links to their canonical Library writing units. */

function writingUnitLayerIds(entry, schemas) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    return new Set(
        (schema?.layers ?? [])
            .filter(
                ({ semanticRole }) =>
                    semanticRole === "atomicWritingUnit" ||
                    semanticRole === "compoundWritingUnit",
            )
            .map(({ id }) => id),
    );
}

export function resolveLabelComposition(label, entry, schemas, entries) {
    if (typeof label !== "string" || !label) return [];
    const layerIds = writingUnitLayerIds(entry, schemas);
    const candidates = entries
        .filter(
            (candidate) =>
                candidate.id !== entry.id &&
                candidate.schemaId === entry.schemaId &&
                candidate.language === entry.language &&
                layerIds.has(candidate.layer) &&
                typeof candidate.label === "string" &&
                candidate.label,
        )
        .sort((left, right) => right.label.length - left.label.length);
    const resolved = new Map([[label.length, []]]);
    for (let offset = label.length - 1; offset >= 0; offset -= 1) {
        for (const candidate of candidates) {
            if (!label.startsWith(candidate.label, offset)) continue;
            const remainder = resolved.get(offset + candidate.label.length);
            if (!remainder) continue;
            resolved.set(offset, [candidate, ...remainder]);
            break;
        }
    }
    return resolved.get(0) ?? [];
}

function normalizedLabel(value) {
    return String(value).trim().normalize();
}

export function distinctPronunciationLabels(entry, secondaryLabels = []) {
    const blocked = new Set(
        [entry.label, ...secondaryLabels].map(normalizedLabel),
    );
    const pronunciation = entry.fields?.pronunciation;
    if (!pronunciation) return [];
    const labels = Array.isArray(pronunciation)
        ? pronunciation
        : [pronunciation];
    return Array.from(
        new Set(
            labels
                .map(normalizedLabel)
                .filter((label) => label && !blocked.has(label)),
        ),
    );
}
