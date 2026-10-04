import {
    referencedTransformation,
    transformationPathways,
} from "./transformations.js";

const LITERAL_PREFIX = "literal:";
const TRANSFORMATION_PREFIX = "transformation:";

export function literalCompositionToken(value) {
    return `${LITERAL_PREFIX}${encodeURIComponent(value)}`;
}

export function transformationCompositionToken(entryId, setId, node) {
    return `${TRANSFORMATION_PREFIX}${encodeURIComponent(JSON.stringify({ entryId, setId, state: node.state, value: node.value, pronunciation: node.pronunciation, definition: node.definition, path: node.path }))}`;
}

export function transformationTokenDetails(token) {
    if (!token.startsWith(TRANSFORMATION_PREFIX)) return null;
    try {
        return JSON.parse(
            decodeURIComponent(token.slice(TRANSFORMATION_PREFIX.length)),
        );
    } catch {
        return null;
    }
}

export function compositionTokenEntryId(token) {
    return transformationTokenDetails(token)?.entryId ?? token;
}

export function compositionTokenLabel(token, entries) {
    if (token.startsWith(LITERAL_PREFIX))
        return decodeURIComponent(token.slice(LITERAL_PREFIX.length));
    const transformation = transformationTokenDetails(token);
    if (transformation) return transformation.value;
    return entries.find(({ id }) => id === token)?.label ?? "";
}

export function restoreCompositionTokens(
    entry,
    entries,
    constructor,
    inputRelationshipIds,
    schema,
) {
    const references = (entry.references ?? [])
        .filter(({ relation }) => inputRelationshipIds.has(relation))
        .slice()
        .sort(
            (left, right) =>
                (left.position ?? Number.MAX_SAFE_INTEGER) -
                (right.position ?? Number.MAX_SAFE_INTEGER),
        )
        .map((reference) => ({
            entry: entries.find(({ id }) => id === reference.entryId),
            transformation: reference.transformation,
        }))
        .filter(({ entry }) => Boolean(entry));
    const literals = (constructor.literal_carousels ?? [])
        .flatMap(({ values }) => values)
        .toSorted((left, right) => right.length - left.length);
    const tokens = [];
    let referenceIndex = 0;
    for (let cursor = 0; cursor < entry.label.length;) {
        const referenceItem = references[referenceIndex];
        const reference = referenceItem?.entry;
        const transformation = reference
            ? (referencedTransformation(
                  reference,
                  schema,
                  referenceItem.transformation,
              ) ??
              transformationPathways(reference, schema)
                  .flatMap(({ set, nodes }) =>
                      nodes.slice(1).map((node) => ({ set, node })),
                  )
                  .find(({ node }) =>
                      entry.label.startsWith(node.value, cursor),
                  ))
            : null;
        if (
            reference &&
            (entry.label.startsWith(reference.label, cursor) || transformation)
        ) {
            tokens.push(
                transformation
                    ? transformationCompositionToken(
                          reference.id,
                          transformation.set.id,
                          transformation.node,
                      )
                    : reference.id,
            );
            cursor +=
                transformation?.node.value.length ?? reference.label.length;
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
