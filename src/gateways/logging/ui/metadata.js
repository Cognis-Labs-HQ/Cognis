/** Copies bounded diagnostic metadata while removing credentials and raw errors. */
export function safeMetadata(
    value,
    depth = 0,
    seen = new WeakSet(),
    budget = { remaining: 8192 },
) {
    if (budget.remaining <= 0) return undefined;
    budget.remaining -= 8;
    if (typeof value === "string") {
        const text = value.slice(
            0,
            Math.max(0, Math.min(512, budget.remaining)),
        );
        budget.remaining -= text.length;
        return text;
    }
    if (
        typeof value === "boolean" ||
        typeof value === "number" ||
        value === null
    )
        return value;
    if (!value || typeof value !== "object" || depth >= 4 || seen.has(value))
        return undefined;
    if (value instanceof Error) return { errorName: value.name };
    seen.add(value);
    if (Array.isArray(value))
        return value
            .slice(0, 16)
            .map((item) => safeMetadata(item, depth + 1, seen, budget));
    const result = {};
    for (const [key, item] of Object.entries(value).slice(0, 32)) {
        if (budget.remaining <= 0) break;
        budget.remaining -= Math.min(key.length, 100);
        if (
            /password|secret|token|credential|authorization|cookie|recovery|loginattempt|^code$|^body$|^payload$/i.test(
                key,
            )
        )
            continue;
        if (key === "error") {
            if (
                item &&
                typeof item === "object" &&
                typeof item.name === "string"
            )
                result.error = { errorName: item.name.slice(0, 80) };
            continue;
        }
        const safe = safeMetadata(item, depth + 1, seen, budget);
        if (safe !== undefined) result[key.slice(0, 100)] = safe;
    }
    return result;
}
