const DEFAULT_LANGUAGE = "en";
const SAFE_LANGUAGE_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/;

/**
 * Parses the `langs` (or legacy `lang`) query parameter into an ordered list of
 * language codes to try when resolving a localised doc file. English is appended
 * as the final fallback if it is not already present in the list.
 *
 * @param url - The request URL to read query params from.
 * @returns An ordered array of validated language codes ending with "en".
 */
function resolveLanguages(url: URL): string[] {
    const raw = (
        url.searchParams.get("langs") ||
        url.searchParams.get("lang") ||
        ""
    ).toLowerCase();
    const seen = new Set<string>();
    const result: string[] = [];
    for (const candidate of raw.split(",")) {
        const language = candidate.trim();
        if (SAFE_LANGUAGE_PATTERN.test(language) && !seen.has(language)) {
            seen.add(language);
            result.push(language);
        }
    }
    if (!seen.has(DEFAULT_LANGUAGE)) result.push(DEFAULT_LANGUAGE);
    return result;
}
export { resolveLanguages as resolveLangs };
