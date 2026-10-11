export function compactDrawingPattern(pattern) {
    const columns = pattern.columns ?? 1;
    if (columns <= 1 || pattern.groups?.length !== columns) return pattern;

    const padding = 0.075;
    let strokeOffset = 0;
    let width = 0;
    const pieces = pattern.groups.map((length) => {
        const strokes = pattern.strokes.slice(
            strokeOffset,
            strokeOffset + length,
        );
        strokeOffset += length;
        const coordinates = strokes.flatMap(({ points }) =>
            points.map(({ x }) => x * columns),
        );
        const left = Math.min(...coordinates);
        const right = Math.max(...coordinates);
        const offset = width;
        width += right - left + padding * 2;
        return { strokes, left, offset };
    });
    const aspectRatio = Math.max(1, width);
    if (aspectRatio >= columns) return pattern;
    const margin = (aspectRatio - width) / 2;
    return {
        ...pattern,
        aspectRatio,
        strokes: pieces.flatMap(({ strokes, left, offset }) =>
            strokes.map((stroke) => ({
                ...stroke,
                points: stroke.points.map((point) => ({
                    ...point,
                    x:
                        (point.x * columns - left + offset + padding + margin) /
                        aspectRatio,
                })),
            })),
        ),
    };
}
