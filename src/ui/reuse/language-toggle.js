/**
 * Binds the dashboard language switcher to language manifests and preferences.
 *
 * - bindLanguageToggle(options) — shows and binds the switcher when enabled and
 *   at least two preferred languages are available.
 * - shouldShowLanguageToggle(preferences, languages) — evaluates visibility.
 * - promoteLanguage(languages, selectedCode) — moves a language to first place.
 *
 * Usage:
 *   bindLanguageToggle({ i18n, navigateTo, showToast });
 *
 * @param {{ i18n: { t: (key: string) => string }, navigateTo: (url: string) => void, showToast: Function }} options
 * @returns {Promise<void>}
 */
import { apiFetch } from "./api-client.js";
import { readPreferredLanguages, setPreferredLanguages } from "./i18n.js";
import { loadUiPreferences, saveUiPreferences } from "./ui-preferences.js";

const COMMIT_DELAY_MS = 5000;
const HANDLERS_BOUND_KEY = "__cognisLanguageToggleBound";

export function shouldShowLanguageToggle(preferences, languages) {
    return (
        preferences?.alwaysShowLanguageSwitcher !== false &&
        languages.length > 1
    );
}

export function promoteLanguage(languages, selectedCode) {
    return [
        selectedCode,
        ...languages.filter((isoCode) => isoCode !== selectedCode),
    ];
}

export async function bindLanguageToggle({ i18n, navigateTo, showToast }) {
    const toggle = document.querySelector("#language-toggle");
    if (!toggle) return;

    const preferences = await loadUiPreferences();
    const preferredLanguages = Array.isArray(preferences?.languagePriority)
        ? preferences.languagePriority
        : readPreferredLanguages();
    if (!shouldShowLanguageToggle(preferences, preferredLanguages)) {
        toggle.hidden = true;
        return;
    }

    try {
        const response = await apiFetch("/api/v1/system/languages");
        if (!response.ok)
            throw new Error(`language_catalog_${response.status}`);
        const payload = await response.json();
        const catalog = payload.data ?? [];
        const availableLanguages = preferredLanguages
            .map((isoCode) =>
                catalog.find((language) => language.iso_code === isoCode),
            )
            .filter(Boolean);
        if (availableLanguages.length < 2) return;

        let selectedIndex = 0;
        let commitTimer;
        const render = () => {
            const language = availableLanguages[selectedIndex];
            toggle.replaceChildren();
            const flag = document.createElement("img");
            flag.src = language.flag;
            flag.alt = "";
            flag.width = 28;
            flag.height = 28;
            toggle.append(flag);
            toggle.title = language.name;
            toggle.setAttribute(
                "aria-label",
                `${i18n.t("ui.layout.language.aria")}: ${language.name}`,
            );
        };

        render();
        toggle.hidden = false;
        if (toggle[HANDLERS_BOUND_KEY]) return;
        toggle[HANDLERS_BOUND_KEY] = true;
        toggle.addEventListener("click", () => {
            selectedIndex = (selectedIndex + 1) % availableLanguages.length;
            render();
            clearTimeout(commitTimer);
            commitTimer = setTimeout(async () => {
                const selectedCode = availableLanguages[selectedIndex].iso_code;
                const nextPriority = promoteLanguage(
                    preferredLanguages,
                    selectedCode,
                );
                try {
                    setPreferredLanguages(nextPriority, { mode: "manual" });
                    await saveUiPreferences({
                        languagePriority: nextPriority,
                        languagePriorityMode: "manual",
                    });
                    console.info("[language-toggle]:language-selected", {
                        selectedCode,
                    });
                    window.location.reload();
                } catch (error) {
                    console.error("[language-toggle]:language-save-failed", {
                        error,
                    });
                    showToast(i18n.t("ui.reuse.error"), { variant: "error" });
                }
            }, COMMIT_DELAY_MS);
        });
        toggle.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            navigateTo("/settings#language");
        });
    } catch (error) {
        toggle.hidden = true;
        console.error("[language-toggle]:catalog-load-failed", { error });
        showToast(i18n.t("ui.reuse.error"), { variant: "error" });
    }
}
