/** Validate the canonical English source before creating or editing a definition. */
export function definitionTranslations(value: unknown): Record<string, string> {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        typeof (value as Record<string, unknown>).en !== "string" ||
        !(value as Record<string, string>).en.trim()
    )
        throw new Error("definition_english_required");
    return value as Record<string, string>;
}
