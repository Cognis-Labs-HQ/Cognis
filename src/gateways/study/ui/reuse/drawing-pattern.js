function ownDrawingPattern(entry, layer) {
    return (layer?.fields ?? [])
        .filter(({ type }) => type === "strokePattern")
        .map(({ id }) => entry.fields?.[id])
        .find(Boolean);
}

function orderedDrawingPieces(entry, entries, schemas) {
    const drawable = entries
        .map((candidate) => {
            const schema = schemas.find(({ id }) => id === candidate.schemaId);
            const layer = schema?.layers.find(
                ({ id }) => id === candidate.layer,
            );
            const pattern = ownDrawingPattern(candidate, layer);
            return pattern &&
                ["atomicWritingUnit", "compoundWritingUnit"].includes(
                    layer?.semanticRole,
                )
                ? { entry: candidate, pattern }
                : null;
        })
        .filter(Boolean)
        .sort(
            (left, right) => right.entry.label.length - left.entry.label.length,
        );
    const written = [];
    const label = entry.label.replaceAll(/\s/gu, "");
    let offset = 0;
    while (offset < label.length) {
        const candidate = drawable.find(
            ({ entry: item }) =>
                item.label && label.startsWith(item.label, offset),
        );
        if (!candidate) break;
        written.push(candidate);
        offset += candidate.entry.label.length;
    }
    if (written.length && offset === label.length) return written;
    return [];
}

export function drawingPattern(entry, layer, entries = [], schemas = []) {
    if (
        layer?.semanticRole === "orderedLexicalSequence" ||
        ["composite", "sentence"].includes(entry.class)
    )
        return undefined;
    const own = ownDrawingPattern(entry, layer);
    if (
        own &&
        ["atomicWritingUnit", "compoundWritingUnit"].includes(
            layer?.semanticRole,
        )
    )
        return { ...own, groups: own.groups ?? [own.strokes.length] };
    const pieces = orderedDrawingPieces(entry, entries, schemas);
    if (!pieces.length) return undefined;
    const columns = pieces.length;
    const inset = 0.025;
    return {
        coordinateSystem: "normalized",
        tolerance: Math.min(
            ...pieces.map(({ pattern }) => pattern.tolerance ?? 55),
        ),
        strokes: pieces.flatMap(({ pattern }, column) =>
            pattern.strokes.map((stroke) => ({
                ...stroke,
                points: stroke.points.map((point) => ({
                    ...point,
                    x: (column + inset + point.x * (1 - inset * 2)) / columns,
                })),
            })),
        ),
        groups: pieces.map(({ pattern }) => pattern.strokes.length),
        columns,
    };
}
