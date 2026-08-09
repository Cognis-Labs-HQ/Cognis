/**
 * Provides the dashboard language switcher and language-priority operations.
 *
 * - getNextLanguage() — resolves the next preferred language in the cycle.
 * - promoteLanguage() — moves a selected language to the front of a priority list.
 * - bindLanguageSwitcher() — displays and binds the opt-in dashboard control.
 *
 * Usage:
 *   bindLanguageSwitcher({ preferences, i18n });
 *
 * @param {string[]} languages
 * @param {string} currentLanguage
 * @returns {string | null}
 */
import { readPreferredLanguages, setPreferredLanguages } from "./i18n.js";
import { saveUiPreferences } from "./ui-preferences.js";
import { showToast } from "./toast.js";

const LANGUAGE_COMMIT_DELAY_MS = 5000;

export function getNextLanguage(languages, currentLanguage) {
    if (!Array.isArray(languages) || languages.length === 0) return null;
    const currentIndex = languages.indexOf(currentLanguage);
    return languages[(currentIndex + 1) % languages.length];
}

export function promoteLanguage(languages, selectedLanguage) {
    if (!Array.isArray(languages) || !languages.includes(selectedLanguage)) {
        return [...(languages ?? [])];
    }
    return [
        selectedLanguage,
        ...languages.filter((language) => language !== selectedLanguage),
    ];
}

/**
 * Shows the dashboard switcher when enabled and commits the last selected
 * language after five seconds without another click.
 *
 * @param {{ preferences?: object | null, i18n: { t: (key: string) => string } }} options
 * @returns {void}
 */
export function bindLanguageSwitcher({ preferences, i18n }) {
    const existingButton = document.querySelector("#language-switcher");
    if (!existingButton) return;
    const button = existingButton.cloneNode(true);
    existingButton.replaceWith(button);

    const languages = readPreferredLanguages();
    const enabled = preferences?.languageSwitcherShow === true;
    button.hidden = !enabled || languages.length < 2;
    if (button.hidden) return;

    let selectedLanguage = languages[0];
    let commitTimer = null;

    function renderSelection() {
        button.textContent = selectedLanguage.toUpperCase();
        button.setAttribute(
            "aria-label",
            i18n
                .t("ui.layout.language_switcher.aria")
                .replace("{language}", selectedLanguage.toUpperCase()),
        );
    }

    renderSelection();
    button.dataset.languageSwitcherBound = "true";
    button.addEventListener("click", () => {
        selectedLanguage = getNextLanguage(languages, selectedLanguage);
        renderSelection();
        if (commitTimer) clearTimeout(commitTimer);
        commitTimer = setTimeout(async () => {
            const languagePriority = promoteLanguage(
                languages,
                selectedLanguage,
            );
            try {
                await saveUiPreferences({
                    languagePriority,
                    languagePriorityMode: "manual",
                });
                setPreferredLanguages(languagePriority, { mode: "manual" });
                console.info("[language-switcher]:language-selected", {
                    language: selectedLanguage,
                });
                window.location.reload();
            } catch (error) {
                console.error("[language-switcher]:language-save-failed", {
                    language: selectedLanguage,
                    error,
                });
                showToast(i18n.t("ui.layout.language_switcher.error"), {
                    variant: "error",
                });
            }
        }, LANGUAGE_COMMIT_DELAY_MS);
    });
}
