/**
 * Binds the dashboard language switcher to language manifests and preferences.
 *
 * - bindLanguageToggle(options) — shows and binds the switcher when enabled and
 *   at least two preferred languages are available.
 * - shouldShowLanguageToggle(preferences, languages) — evaluates visibility.
 *
 * Usage:
 *   bindLanguageToggle({ i18n, navigateTo, showToast });
 *
 * @param {{ i18n: { t: (key: string) => string }, navigateTo: (url: string) => void, showToast: Function }} options
 * @returns {Promise<void>}
 */
import {
    loadUiLanguageCatalog,
    changeUiLanguage,
} from "./ui-language-catalog.js";
import { activeUiLanguage } from "./ui-language-state.js";
import { readPreferredLanguages } from "./i18n.js";
import { loadUiPreferences } from "./ui-preferences.js";

const COMMIT_DELAY_MS = 2000;
const bindings = (globalThis[Symbol.for("cognis.languageToggleBindings")] ??=
    new WeakMap());

export function shouldShowLanguageToggle(preferences, languages) {
    return (
        preferences?.alwaysShowLanguageSwitcher !== false &&
        languages.length > 1
    );
}

export async function bindLanguageToggle({
    i18n,
    navigateTo,
    showToast,
    preferences: suppliedPreferences,
    signal,
}) {
    const toggle = document.querySelector("#language-toggle");
    if (!toggle) return;

    bindings.get(toggle)?.abort();
    const scope = new AbortController();
    bindings.set(toggle, scope);
    if (signal?.aborted) {
        scope.abort();
        return;
    }
    signal?.addEventListener("abort", () => scope.abort(), { once: true });
    const preferences = await (suppliedPreferences ?? loadUiPreferences());
    const preferredLanguages = Array.isArray(preferences?.languagePriority)
        ? preferences.languagePriority
        : readPreferredLanguages();
    if (preferredLanguages.length < 2) {
        toggle.hidden = true;
        return;
    }
    const shouldShow = shouldShowLanguageToggle(
        preferences,
        preferredLanguages,
    );

    try {
        const catalog = await loadUiLanguageCatalog();
        const availableLanguages = preferredLanguages
            .map((isoCode) =>
                catalog.find((language) => language.iso_code === isoCode),
            )
            .filter(Boolean);
        if (availableLanguages.length < 2) return;

        scope.signal.throwIfAborted();
        const currentIndex = () =>
            Math.max(
                0,
                availableLanguages.findIndex(
                    (language) =>
                        language.iso_code ===
                        (activeUiLanguage() ?? i18n.locale),
                ),
            );
        let selectedIndex = currentIndex();
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
        toggle.hidden = !shouldShow;
        window.addEventListener(
            "cognis:language-switcher-visibility",
            (event) => {
                toggle.hidden = event.detail?.visible !== true;
            },
            { signal: scope.signal },
        );
        scope.signal.addEventListener(
            "abort",
            () => clearTimeout(commitTimer),
            { once: true },
        );
        toggle.addEventListener(
            "click",
            () => {
                selectedIndex = (selectedIndex + 1) % availableLanguages.length;
                render();
                clearTimeout(commitTimer);
                commitTimer = setTimeout(async () => {
                    const selectedCode =
                        availableLanguages[selectedIndex].iso_code;
                    try {
                        const applied = await changeUiLanguage(selectedCode);
                        if (!applied && !scope.signal.aborted) {
                            selectedIndex = currentIndex();
                            render();
                        }
                    } catch (error) {
                        if (scope.signal.aborted) return;
                        selectedIndex = currentIndex();
                        render();
                        console.error(
                            "[language-toggle]:language-save-failed",
                            {
                                error,
                            },
                        );
                        showToast(i18n.t("ui.reuse.error"), {
                            variant: "error",
                        });
                    }
                }, COMMIT_DELAY_MS);
            },
            { signal: scope.signal },
        );
        toggle.addEventListener(
            "contextmenu",
            (event) => {
                event.preventDefault();
                navigateTo("/settings#language");
            },
            { signal: scope.signal },
        );
    } catch (error) {
        if (scope.signal.aborted) return;
        toggle.hidden = true;
        console.error("[language-toggle]:catalog-load-failed", { error });
        showToast(i18n.t("ui.reuse.error"), { variant: "error" });
    }
}
