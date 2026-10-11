export function validateStrokePattern(value: unknown): boolean {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const pattern = value as {
        coordinateSystem?: unknown;
        tolerance?: unknown;
        strokes?: unknown;
    };
    if (pattern.coordinateSystem !== "normalized") return false;
    if (
        pattern.tolerance !== undefined &&
        (typeof pattern.tolerance !== "number" ||
            !Number.isFinite(pattern.tolerance) ||
            pattern.tolerance < 0 ||
            pattern.tolerance > 100)
    )
        return false;
    if (!Array.isArray(pattern.strokes) || !pattern.strokes.length)
        return false;
    return pattern.strokes.every((stroke) => {
        if (!stroke || typeof stroke !== "object") return false;
        const points = (stroke as { points?: unknown }).points;
        if (!Array.isArray(points) || points.length < 2) return false;
        let previousTime = -1;
        return points.every((point) => {
            if (!point || typeof point !== "object") return false;
            const candidate = point as Record<string, unknown>;
            const valid =
                typeof candidate.x === "number" &&
                Number.isFinite(candidate.x) &&
                candidate.x >= 0 &&
                candidate.x <= 1 &&
                typeof candidate.y === "number" &&
                Number.isFinite(candidate.y) &&
                candidate.y >= 0 &&
                candidate.y <= 1 &&
                typeof candidate.time === "number" &&
                Number.isFinite(candidate.time) &&
                candidate.time >= previousTime &&
                (candidate.pressure === undefined ||
                    (typeof candidate.pressure === "number" &&
                        Number.isFinite(candidate.pressure) &&
                        candidate.pressure >= 0 &&
                        candidate.pressure <= 1));
            if (valid) previousTime = candidate.time as number;
            return valid;
        });
    });
}
