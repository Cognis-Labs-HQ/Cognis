/** Resolve complete labels into links to their canonical Library writing units. */

function composableLayerIds(entry, schemas) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    return new Set(
        (schema?.layers ?? [])
            .filter(
                ({ semanticRole }) =>
                    semanticRole === "atomicWritingUnit" ||
                    semanticRole === "compoundWritingUnit" ||
                    semanticRole === "lexicalUnit",
            )
            .map(({ id }) => id),
    );
}

export function resolveLabelComposition(label, entry, schemas, entries) {
    if (typeof label !== "string" || !label) return [];
    const layerIds = composableLayerIds(entry, schemas);
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
        .sort((left, right) => {
            const schema = schemas.find(({ id }) => id === entry.schemaId);
            const role = (candidate) =>
                schema?.layers.find(({ id }) => id === candidate.layer)
                    ?.semanticRole;
            const rank = (candidate) =>
                role(candidate) === "lexicalUnit"
                    ? 3
                    : role(candidate) === "compoundWritingUnit"
                      ? 2
                      : 1;
            return (
                right.label.length - left.label.length ||
                rank(right) - rank(left)
            );
        });
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
    return String(value).trim().normalize("NFKC");
}

function entryAliases(entry) {
    const pronunciation = entry.fields?.pronunciation;
    const values = Array.isArray(pronunciation)
        ? pronunciation
        : pronunciation
          ? [pronunciation]
          : [];
    return Array.from(
        new Set([entry.label, ...values].map(normalizedLabel).filter(Boolean)),
    ).sort((left, right) => right.length - left.length);
}

export function resolveReferenceAliasComposition(label, entries) {
    const normalized = normalizedLabel(label);
    if (!normalized || !entries.length) return [];
    let offset = 0;
    for (const entry of entries) {
        const alias = entryAliases(entry).find((candidate) =>
            normalized.startsWith(candidate, offset),
        );
        if (!alias) return [];
        offset += alias.length;
    }
    return offset === normalized.length ? entries : [];
}

function entryLinkKey(entry) {
    return `${entry.id}\u0000${normalizedLabel(entry.label)}`;
}

export function excludeTitleReferenceDuplicates(groups, titleReferences) {
    const titleReferenceKeys = new Set(titleReferences.map(entryLinkKey));
    return groups
        .map((group) =>
            group.filter(
                (entry) => !titleReferenceKeys.has(entryLinkKey(entry)),
            ),
        )
        .filter((group) => group.length > 0);
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
