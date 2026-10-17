export function separateLookupDefinitions(definitions = []) {
    return definitions.flatMap((definition) => {
        const parts = Object.fromEntries(
            Object.entries(definition.translations).map(([language, text]) => [
                language,
                text
                    .split(/[;；]/u)
                    .map((value) => value.trim())
                    .filter(Boolean),
            ]),
        );
        const meanings = parts.en ?? [];
        if (meanings.length <= 1) return [definition];
        return meanings.map((meaning, index) => ({
            ...definition,
            translations: Object.fromEntries(
                Object.entries(parts).flatMap(([language, values]) => {
                    const value =
                        values.length === meanings.length
                            ? values[index]
                            : index === 0
                              ? values.join("; ")
                              : "";
                    return value ? [[language, value]] : [];
                }),
            ),
            provenance: definition.provenance
                ? `${definition.provenance}:${index}`
                : undefined,
        }));
    });
}
