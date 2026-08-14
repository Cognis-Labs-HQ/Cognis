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
import { uiCtx } from "./ui-ctx.js";
import { createLanguageFlag } from "./language-flag.js";

const LANGUAGE_COMMIT_DELAY_MS = 5000;
const SWITCHER_HANDLER_KEY = "__cognisLanguageSwitcherHandler";
const SWITCHER_OPTIONS_KEY = "__cognisLanguageSwitcherOptions";
let pendingCommitTimer = null;

uiCtx.extendFlow(
    "switch-language",
    "persist-preferences",
    { id: "ui:language-switcher:persist" },
    ({ input }) =>
        saveUiPreferences({
            languagePriority: input.languagePriority,
            languagePriorityMode: "manual",
        }),
);
uiCtx.extendFlow(
    "switch-language",
    "apply-language",
    { id: "ui:language-switcher:apply" },
    ({ input }) =>
        setPreferredLanguages(input.languagePriority, { mode: "manual" }),
);
uiCtx.extendFlow(
    "switch-language",
    "record-selection",
    { id: "ui:language-switcher:record" },
    ({ input }) =>
        console.info("[language-switcher]:language-selected", {
            language: input.selectedLanguage,
        }),
);
uiCtx.extendFlow(
    "switch-language",
    "reload-page",
    { id: "ui:language-switcher:reload" },
    () => window.location.reload(),
);

function cancelPendingCommit() {
    if (!pendingCommitTimer) return;
    clearTimeout(pendingCommitTimer);
    pendingCommitTimer = null;
}

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
    cancelPendingCommit();
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
        return;
    }

    function renderSelection() {
        const options = button[SWITCHER_OPTIONS_KEY];
        const languageLabel = options.selectedLanguage.toUpperCase();
        button.replaceChildren(
            createLanguageFlag(options.selectedLanguage, {
                className: "language-switcher-flag",
            }),
        );
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
        cancelPendingCommit();
        pendingCommitTimer = setTimeout(async () => {
            pendingCommitTimer = null;
            const currentOptions = button[SWITCHER_OPTIONS_KEY];
            const languagePriority = promoteLanguage(
                currentOptions.languages,
                currentOptions.selectedLanguage,
            );
            try {
                await uiCtx.runFlow("switch-language", {
                    languagePriority,
                    selectedLanguage: currentOptions.selectedLanguage,
                });
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
