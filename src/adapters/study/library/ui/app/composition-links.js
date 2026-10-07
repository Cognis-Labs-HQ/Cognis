/** Resolve complete labels into links to their canonical Library writing units. */

function layerRank(layer) {
    return {
        atomicWritingUnit: 1,
        compoundWritingUnit: 2,
        lexicalUnit: 3,
        orderedLexicalSequence: 4,
    }[layer?.semanticRole];
}

function composableLayerIds(entry, schemas) {
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const sourceRank = layerRank(
        schema?.layers.find(({ id }) => id === entry.layer),
    );
    return new Set(
        (schema?.layers ?? [])
            .filter(
                (layer) =>
                    layerRank(layer) &&
                    sourceRank &&
                    layerRank(layer) < sourceRank,
            )
            .map(({ id }) => id),
    );
}

function pronunciationValues(entry) {
    const pronunciation = entry.fields?.pronunciation;
    if (!pronunciation) return [];
    return (Array.isArray(pronunciation) ? pronunciation : [pronunciation]).map(
        (value) =>
            Array.isArray(value)
                ? value.flat(Infinity).map(String).join("")
                : String(value),
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
                candidate.label &&
                label.includes(candidate.label),
        )
        .sort((left, right) => {
            const schema = schemas.find(({ id }) => id === entry.schemaId);
            const rank = (candidate) =>
                layerRank(
                    schema?.layers.find(({ id }) => id === candidate.layer),
                );
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

export function resolveCompositionDependants(entry, schemas, entries) {
    return entries.filter((candidate) => {
        if (
            candidate.id === entry.id ||
            candidate.schemaId !== entry.schemaId ||
            candidate.language !== entry.language
        )
            return false;
        return [candidate.label, ...pronunciationValues(candidate)]
            .filter(
                (label) =>
                    typeof label === "string" && label.includes(entry.label),
            )
            .some((label) =>
                resolveLabelComposition(
                    label,
                    candidate,
                    schemas,
                    entries,
                ).some(({ id }) => id === entry.id),
            );
    });
}

function normalizedLabel(value) {
    return String(value).trim().normalize("NFKC");
}

function entryAliases(entry) {
    return Array.from(
        new Set(
            [entry.label, ...pronunciationValues(entry)]
                .map(normalizedLabel)
                .filter(Boolean),
        ),
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

export function resolveGroupedPronunciation(label, groups) {
    for (const group of groups) {
        const entries = resolveReferenceAliasComposition(label, group);
        if (entries.length) return entries;
    }
    return [];
}

function entryLinkKey(entry) {
    return `${entry.id}\u0000${normalizedLabel(entry.label)}`;
}

export function excludeTitleReferenceDuplicates(groups, titleReferences) {
    const titleReferenceKey = titleReferences.map(entryLinkKey).join("\u0001");
    return groups.filter(
        (group) => group.map(entryLinkKey).join("\u0001") !== titleReferenceKey,
    );
}

export function distinctPronunciationLabels(entry, secondaryLabels = []) {
    const blocked = new Set(
        [entry.label, ...secondaryLabels].map(normalizedLabel),
    );
    return Array.from(
        new Set(
            pronunciationValues(entry)
                .map(normalizedLabel)
                .filter((label) => label && !blocked.has(label)),
        ),
    );
}
