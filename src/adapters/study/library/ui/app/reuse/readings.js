/** Extract flat reading values without changing their authored order. */
export function pronunciationValues(entry) {
    const pronunciation = entry.fields?.pronunciation;
    if (!pronunciation) return [];
    return (Array.isArray(pronunciation) ? pronunciation : [pronunciation]).map(
        (value) =>
            Array.isArray(value)
                ? value.flat(Infinity).map(String).join("")
                : String(value),
    );
}
