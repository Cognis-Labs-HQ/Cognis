const PRIVATE_USE_LANGUAGE_PATTERN = /^x(?:-[a-z0-9]{1,8})+$/i;

export function canonicalizeLanguageTag(value: string): string {
    const language = value.trim();
    if (!language || language.length > 63) throw new Error("invalid_language");
    if (PRIVATE_USE_LANGUAGE_PATTERN.test(language)) {
        return language.toLowerCase();
    }
    try {
        return Intl.getCanonicalLocales(language)[0];
    } catch {
        throw new Error("invalid_language");
    }
}
