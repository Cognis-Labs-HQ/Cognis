/**
 * Resolves language preference changes at the Settings save boundary.
 * Public exports: hasLanguagePriorityChanged compares saved ordering; resolveLanguagePriorityMode selects pending or persisted priority policy.
 * @example hasLanguagePriorityChanged(["en"], ["ja", "en"]); // true
 */

/**
 * Returns true when the language priority order has changed between
 * two saves, indicating a page reload is required to apply new strings.
 *
 * @param {string[]} previous - Previously committed language priority list.
 * @param {string[]} next - Newly saved language priority list.
 * @returns {boolean}
 */
export function hasLanguagePriorityChanged(previous, next) {
    if (previous.length !== next.length) return true;
    return next.some((language, index) => language !== previous[index]);
}

/**
 * Resolves the language priority mode to persist when the user saves settings.
 * If the language prefs have pending unsaved changes, the pending mode is used
 * (so "sync from browser" correctly resets to "auto"). Otherwise the previously
 * stored/loaded mode is preserved.
 *
 * @param {ReturnType<import('./language-prefs.js').initializeLanguagePreferences> | undefined} languagePreferencesController
 * @param {{ languagePriorityMode?: string } | null} existingPreferences
 * @param {string} storedMode
 * @returns {string}
 */
export function resolveLanguagePriorityMode(
    languagePreferencesController,
    existingPreferences,
    storedMode,
) {
    if (languagePreferencesController?.isDirty()) {
        return languagePreferencesController.getPendingMode() ?? "manual";
    }
    if (existingPreferences?.languagePriorityMode === "manual") return "manual";
    return storedMode;
}
