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
import {
    readPreferredLanguages,
    sanitizeLanguagePriority,
    setPreferredLanguages,
} from "./i18n.js";
import { saveUiPreferences } from "./ui-preferences.js";
import { showToast } from "./toast.js";
import { navigateToSettingsSection } from "./settings-navigation.js";

const LANGUAGE_COMMIT_DELAY_MS = 5000;
const SWITCHER_HANDLER_KEY = "__cognisLanguageSwitcherHandler";
const SWITCHER_OPTIONS_KEY = "__cognisLanguageSwitcherOptions";
const SWITCHER_TIMER_KEY = "__cognisLanguageSwitcherTimer";

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
    const button = document.querySelector("#language-switcher");
    if (!button) return;
    const configuredLanguages = Array.isArray(preferences?.languagePriority)
        ? preferences.languagePriority
        : readPreferredLanguages();
    const languages = sanitizeLanguagePriority(configuredLanguages);
    const enabled = preferences?.languageSwitcherShow !== false;
    button.hidden = !enabled || languages.length <= 1;
    button[SWITCHER_OPTIONS_KEY] = {
        i18n,
        languages,
        selectedLanguage: languages[0] ?? null,
    };
    if (button.hidden) {
        if (button[SWITCHER_TIMER_KEY]) {
            clearTimeout(button[SWITCHER_TIMER_KEY]);
            button[SWITCHER_TIMER_KEY] = null;
        }
        return;
    }

    function renderSelection() {
        const options = button[SWITCHER_OPTIONS_KEY];
        const languageLabel = options.selectedLanguage.toUpperCase();
        button.textContent = languageLabel;
        button.setAttribute(
            "aria-label",
            options.i18n
                .t("ui.layout.language_switcher.aria")
                .replace("{language}", languageLabel),
        );
    }

    renderSelection();
    if (button[SWITCHER_HANDLER_KEY]) return;
    button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        navigateToSettingsSection("language");
    });
    const handler = () => {
        const options = button[SWITCHER_OPTIONS_KEY];
        options.selectedLanguage = getNextLanguage(
            options.languages,
            options.selectedLanguage,
        );
        renderSelection();
        if (button[SWITCHER_TIMER_KEY]) {
            clearTimeout(button[SWITCHER_TIMER_KEY]);
        }
        button[SWITCHER_TIMER_KEY] = setTimeout(async () => {
            const currentOptions = button[SWITCHER_OPTIONS_KEY];
            const languagePriority = promoteLanguage(
                currentOptions.languages,
                currentOptions.selectedLanguage,
            );
            try {
                await saveUiPreferences({
                    languagePriority,
                    languagePriorityMode: "manual",
                });
                setPreferredLanguages(languagePriority, { mode: "manual" });
                console.info("[language-switcher]:language-selected", {
                    language: currentOptions.selectedLanguage,
                });
                window.location.reload();
            } catch (error) {
                console.error("[language-switcher]:language-save-failed", {
                    language: currentOptions.selectedLanguage,
                    error,
                });
                showToast(
                    currentOptions.i18n.t("ui.layout.language_switcher.error"),
                    { variant: "error" },
                );
            }
        }, LANGUAGE_COMMIT_DELAY_MS);
    };
    button[SWITCHER_HANDLER_KEY] = handler;
    button.addEventListener("click", handler);
}
