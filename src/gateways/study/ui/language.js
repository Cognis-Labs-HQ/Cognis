/**
 * Shared language utilities for the Study gateway and language modules.
 *
 * Public exports:
 * - `resolveLanguageLabel(languageCode, fallbackName)` Returns a human-readable display name for a BCP-47 language code.
 * - `isAdminScope()` Returns true when the local session has admin or owner privilege.
 * - `isTeacherScope()` Returns true when the local session role is teacher.
 * - `isStudentScope()` Returns true when the local session role allows student enrolment.
 * - `buildLibraryUrl()` Builds the canonical library URL.
 *
 * @example
 * ```js
 * import { resolveLanguageLabel, isAdminScope, buildLibraryUrl } from '/static/gateways/study/ui/language.js';
 * const label = resolveLanguageLabel('ja', 'Japanese');
 * const url   = buildLibraryUrl();
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
 * @returns {string} Canonical Library path.
 */
export function buildLibraryUrl() {
    return "/study/library";
}
