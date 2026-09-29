const LITERAL_PREFIX = "literal:";

export function literalCompositionToken(value) {
    return `${LITERAL_PREFIX}${encodeURIComponent(value)}`;
}

export function compositionTokenLabel(token, entries) {
    if (token.startsWith(LITERAL_PREFIX))
        return decodeURIComponent(token.slice(LITERAL_PREFIX.length));
    return entries.find(({ id }) => id === token)?.label ?? "";
}

export function restoreCompositionTokens(
    entry,
    entries,
    constructor,
    inputRelationshipIds,
) {
    const references = (entry.references ?? [])
        .filter(({ relation }) => inputRelationshipIds.has(relation))
        .slice()
        .sort(
            (left, right) =>
                (left.position ?? Number.MAX_SAFE_INTEGER) -
                (right.position ?? Number.MAX_SAFE_INTEGER),
        )
        .map(({ entryId }) => entries.find(({ id }) => id === entryId))
        .filter(Boolean);
    const literals = (constructor.literal_carousels ?? [])
        .flatMap(({ values }) => values)
        .toSorted((left, right) => right.length - left.length);
    const tokens = [];
    let referenceIndex = 0;
    for (let cursor = 0; cursor < entry.label.length;) {
        const reference = references[referenceIndex];
        if (reference && entry.label.startsWith(reference.label, cursor)) {
            tokens.push(reference.id);
            cursor += reference.label.length;
            referenceIndex += 1;
            continue;
        }
        const literal = literals.find((value) =>
            entry.label.startsWith(value, cursor),
        );
        if (literal) {
            tokens.push(literalCompositionToken(literal));
            cursor += literal.length;
            continue;
        }
        cursor += Array.from(entry.label.slice(cursor))[0].length;
    }
    return tokens;
}
