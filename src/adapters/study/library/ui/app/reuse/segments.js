/** Return a complete composition, preserving caller-provided candidate priority. */
export function resolveSegments(
    label,
    candidates,
    textOf = (entry) => entry.label,
) {
    const resolved = new Map([[label.length, []]]);
    const tokens = candidates.map((entry) => ({ entry, text: textOf(entry) }));
    for (let offset = label.length - 1; offset >= 0; offset -= 1) {
        for (const { entry, text } of tokens) {
            if (!text || !label.startsWith(text, offset)) continue;
            const tail = resolved.get(offset + text.length);
            if (!tail) continue;
            resolved.set(offset, [entry, ...tail]);
            break;
        }
    }
    return resolved.get(0) ?? [];
}
