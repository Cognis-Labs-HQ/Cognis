/**
 * Shared language utilities for the Study gateway and language modules.
 *
 * Public exports:
 * - `resolveLanguageLabel(languageCode, fallbackName)` Returns a human-readable display name for a BCP-47 language code.
 * - `isAdminScope()` Returns true when the local session has admin or owner privilege.
 * - `isTeacherScope()` Returns true when the local session role is teacher.
 * - `isStudentScope()` Returns true when the local session role allows student enrolment.
 * - `buildLibraryUrl(languageCode)` Builds the canonical library URL, optionally scoped to a language.
 *
 * @example
 * ```js
 * import { resolveLanguageLabel, isAdminScope, buildLibraryUrl } from '/static/gateways/study/ui/language.js';
 * const label = resolveLanguageLabel('ja', 'Japanese');
 * const url   = buildLibraryUrl('ja');
 * ```
 *
 * @param {string} languageCode BCP-47 language code (e.g. 'en', 'ja').
 * @param {string} [fallbackName] Returned when the display name cannot be resolved.
 * @returns {string} Human-readable language label, or `fallbackName` / `languageCode` as fallback.
 */

export {
    isAdminScope,
    isTeacherScope,
    isStudentScope,
} from "/static/reuse/access-role.js";

export function resolveLanguageLabel(languageCode, fallbackName = "") {
    try {
        const displayName = new Intl.DisplayNames(["en"], {
            type: "language",
        }).of(languageCode);
        if (typeof displayName === "string" && displayName.trim()) {
            return displayName;
        }
    } catch {
        return fallbackName || languageCode;
    }
    return fallbackName || languageCode;
}

/**
 * @param {unknown} value Candidate BCP-47 language code.
 * @returns {string | undefined} Canonical language code, or undefined when invalid.
 */
export function parseLanguageCode(value) {
    const candidate = String(value ?? "").trim();
    if (!candidate || candidate.length > 63) return undefined;
    if (/^x(?:-[a-z0-9]{1,8})+$/i.test(candidate)) {
        return candidate.toLowerCase();
    }
    try {
        const [canonical] = Intl.getCanonicalLocales(candidate);
        return canonical;
    } catch {
        return undefined;
    }
}

/**
 * @param {string} url Study URL to update.
 * @param {unknown} languageCode Candidate BCP-47 language code.
 * @returns {string} URL with a validated language query parameter.
 */
export function withLanguageQuery(url, languageCode) {
    const canonicalLanguageCode = parseLanguageCode(languageCode);
    if (!canonicalLanguageCode) return url;
    const parsedUrl = new URL(url, window.location.origin);
    parsedUrl.searchParams.set("language", canonicalLanguageCode);
    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
}

/**
 * @param {string} [languageCode] BCP-47 language code to scope the URL to.
 * @returns {string} Library path, with an optional `?language=` query parameter.
 */
export function buildLibraryUrl(languageCode) {
    return withLanguageQuery("/study/library", languageCode);
}
