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
 * import { resolveLanguageLabel, isAdminScope, buildLibraryUrl } from '/static/modules/study/languages/reuse/language-utils.js';
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
 * @param {string} [languageCode] BCP-47 language code to scope the URL to.
 * @returns {string} Library path, with an optional `?language=` query parameter.
 */
export function buildLibraryUrl(languageCode) {
    const normalizedLanguageCode = String(languageCode ?? "").trim();
    if (!normalizedLanguageCode) {
        return "/study/library";
    }
    return `/study/library?language=${encodeURIComponent(normalizedLanguageCode)}`;
}
