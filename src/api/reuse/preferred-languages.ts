const DEFAULT_LANG = "en";
const SAFE_LANG_PATTERN = /^[a-z]{2}(?:-[a-z]{2})?$/;

/**
 * Parses the `langs` (or legacy `lang`) query parameter into an ordered list of
 * language codes to try when resolving a localised doc file. English is appended
 * as the final fallback if it is not already present in the list.
 *
 * @param url - The request URL to read query params from.
 * @returns An ordered array of validated language codes ending with "en".
 */
export function resolveLangs(url: URL): string[] {
    const raw = (
        url.searchParams.get("langs") ||
        url.searchParams.get("lang") ||
        ""
    ).toLowerCase();
    const seen = new Set<string>();
    const result: string[] = [];
    for (const candidate of raw.split(",")) {
        const lang = candidate.trim();
        if (SAFE_LANG_PATTERN.test(lang) && !seen.has(lang)) {
            seen.add(lang);
            result.push(lang);
        }
    }
    if (!seen.has(DEFAULT_LANG)) result.push(DEFAULT_LANG);
    return result;
}
