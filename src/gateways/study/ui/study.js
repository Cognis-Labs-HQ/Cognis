/**
 * Study hub — welcome onboarding, dashboard, and settings.
 *
 * Routes:
 *   /study/welcome  — one-time onboarding language picker.
 *   /study          — study dashboard.
 *   /study/settings — study language settings.
 *
 * @param {HTMLElement} root
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<void>}
 */

import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";

const SETTINGS_GEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>`;

function resolveLanguageLabel(languageCode, fallbackName = "") {
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

function toLanguageRecord(rawLanguage) {
    const languageCode = String(rawLanguage?.code ?? "").trim();
    if (!languageCode) return null;
    return {
        code: languageCode,
        flag: String(rawLanguage?.flag ?? "").trim(),
        name: resolveLanguageLabel(
            languageCode,
            String(rawLanguage?.name ?? "").trim(),
        ),
    };
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/study/languages"],
    });
    applyDocumentTitle(i18n, "gateway.study.page_title");

    const currentPath = window.location.pathname;
    const isWelcomePath = currentPath === "/study/welcome";
    const isSettingsPath = currentPath === "/study/settings";

    const [languagesResult, prefsResult] = await Promise.allSettled([
        apiFetch("/api/v1/study/registered-languages").then((response) =>
            response.ok ? response.json() : null,
        ),
        apiFetch("/api/v1/study/preferences").then((response) =>
            response.ok ? response.json() : null,
        ),
    ]);

    const registeredLanguages =
        languagesResult.status === "fulfilled" &&
        Array.isArray(languagesResult.value?.data)
            ? languagesResult.value.data
                  .map((language) => toLanguageRecord(language))
                  .filter(Boolean)
            : [];

    const learningLanguages =
        prefsResult.status === "fulfilled" &&
        Array.isArray(prefsResult.value?.data?.learningLanguages)
            ? [...new Set(prefsResult.value.data.learningLanguages)]
            : [];

    if (isWelcomePath) {
        if (learningLanguages.length > 0) {
            navigateTo("/study");
            return;
        }
        await mountWelcome(root, { i18n, registeredLanguages, signal });
        return;
    }

    if (learningLanguages.length === 0) {
        navigateTo("/study/welcome");
        return;
    }

    await mountHub(root, {
        i18n,
        registeredLanguages,
        learningLanguages,
        isSettingsPath,
        signal,
    });
}

async function mountWelcome(root, { i18n, registeredLanguages }) {
    const selectedLanguages = new Set();

    function renderWelcomeContent() {
        const cards =
            registeredLanguages.length === 0
                ? `<p class="study-empty">${escapeHtml(i18n.t("gateway.study.no_languages"))}</p>`
                : registeredLanguages
                      .map(
                          (language, index) => `
                        <button
                            type="button"
                            class="study-lang-card${selectedLanguages.has(language.code) ? " selected" : ""}"
                            data-lang-code="${escapeHtml(language.code)}"
                            style="animation-delay: ${(0.55 + index * 0.06).toFixed(2)}s"
                        >
                            <span class="study-lang-flag">${escapeHtml(language.flag)}</span>
                            <span class="study-lang-name">${escapeHtml(language.name)}</span>
                        </button>
                    `,
                      )
                      .join("");

        return `
            <div class="study-welcome">
                <div class="study-welcome-hero">
                    <span class="study-welcome-icon study-bounce-in">🎓</span>
                    <h1 class="study-welcome-heading study-fade-in-up" style="animation-delay: 0.1s">
                        ${escapeHtml(i18n.t("gateway.study.welcome_heading"))}
                    </h1>
                    <p class="study-welcome-tagline study-fade-in-up" style="animation-delay: 0.25s">
                        ${escapeHtml(i18n.t("gateway.study.welcome_tagline"))}
                    </p>
                    <p class="study-welcome-prompt study-fade-in-up" style="animation-delay: 0.4s">
                        ${escapeHtml(i18n.t("gateway.study.welcome_prompt"))}
                    </p>
                </div>
                <div class="study-language-grid study-fade-in-up" style="animation-delay: 0.55s">
                    ${cards}
                </div>
                <div class="study-welcome-actions study-fade-in-up" style="animation-delay: 0.7s">
                    <button
                        type="button"
                        id="study-start-btn"
                        class="btn-confirm btn-animated study-start-btn"
                        ${selectedLanguages.size === 0 ? "disabled" : ""}
                    >
                        ${escapeHtml(i18n.t("gateway.study.start"))}
                    </button>
                </div>
            </div>
        `;
    }

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [
            {
                id: "study-welcome",
                label: i18n.t("gateway.study.page_title"),
                pinned: true,
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: renderWelcomeContent,
                onRender: bindWelcomeEvents,
            },
        ],
        preferenceKey: "study-welcome-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.page_title"),
        },
        toolbar: [],
    });
    await composer.init();

    function bindWelcomeEvents() {
        root.querySelectorAll(".study-lang-card").forEach((card) => {
            card.addEventListener("click", () => {
                const languageCode = String(card.dataset.langCode ?? "");
                if (!languageCode) return;
                if (selectedLanguages.has(languageCode)) {
                    selectedLanguages.delete(languageCode);
                    card.classList.remove("selected");
                } else {
                    selectedLanguages.add(languageCode);
                    card.classList.add("selected");
                }
                const startButton = root.querySelector("#study-start-btn");
                if (startButton) {
                    startButton.disabled = selectedLanguages.size === 0;
                }
            });
        });

        root.querySelector("#study-start-btn")?.addEventListener(
            "click",
            async () => {
                const selectedList = [...selectedLanguages];
                try {
                    const response = await apiFetch(
                        "/api/v1/study/preferences",
                        {
                            method: "PUT",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                                learningLanguages: selectedList,
                                teachingLanguages: [],
                            }),
                        },
                    );
                    if (!response.ok) throw new Error("save_failed");
                    navigateTo("/study");
                } catch {
                    showToast(i18n.t("ui.reuse.save_failed"), {
                        variant: "error",
                    });
                }
            },
        );
    }
}

async function mountHub(
    root,
    { i18n, registeredLanguages, learningLanguages, isSettingsPath },
) {
    const query = new URLSearchParams(window.location.search);
    const requestedLanguage = query.get("language") ?? "";
    const selectedLanguageCode = learningLanguages.includes(requestedLanguage)
        ? requestedLanguage
        : learningLanguages[0];

    const languageModulesMap = new Map();
    const discoveredLanguageCodes = new Set();

    async function loadModulesForLanguage(languageCode) {
        try {
            const response = await apiFetch(
                `/api/v1/study/languages/${encodeURIComponent(languageCode)}/modules`,
            );
            if (!response.ok) {
                languageModulesMap.set(languageCode, []);
                return;
            }
            const payload = await response.json();
            const childComponents = Array.isArray(payload?.data)
                ? payload.data
                : [];
            languageModulesMap.set(languageCode, childComponents);
            discoveredLanguageCodes.add(languageCode);
        } catch {
            languageModulesMap.set(languageCode, []);
        }
    }

    await Promise.allSettled(
        learningLanguages.map((languageCode) =>
            loadModulesForLanguage(languageCode),
        ),
    );

    const languageByCode = new Map();
    for (const language of registeredLanguages) {
        languageByCode.set(language.code, language);
    }
    for (const languageCode of discoveredLanguageCodes) {
        if (!languageByCode.has(languageCode)) {
            languageByCode.set(languageCode, {
                code: languageCode,
                flag: "",
                name: resolveLanguageLabel(languageCode),
            });
        }
    }

    const languageCatalog = Array.from(languageByCode.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );

    const selectedLanguageModules =
        languageModulesMap.get(selectedLanguageCode) ?? [];

    function getLanguage(languageCode) {
        return (
            languageByCode.get(languageCode) ?? {
                code: languageCode,
                flag: "",
                name: resolveLanguageLabel(languageCode),
            }
        );
    }

    function buildHubUrl(languageCode) {
        return `/study?language=${encodeURIComponent(languageCode)}`;
    }

    function buildSettingsUrl(languageCode) {
        return `/study/settings?language=${encodeURIComponent(languageCode)}`;
    }

    function renderSubNavigation() {
        const moduleLinks = selectedLanguageModules
            .map((component) => {
                const pageUrl = String(component.pageUrl ?? "").trim();
                if (!pageUrl) return "";
                const activeClass =
                    window.location.pathname === pageUrl ? " active" : "";
                return `
                    <li>
                        <a class="study-subnav-module-link${activeClass}" href="${escapeHtml(pageUrl)}">
                            ${escapeHtml(String(component.label ?? pageUrl))}
                        </a>
                    </li>
                `;
            })
            .join("");

        const activeLanguageLinks = learningLanguages
            .map((languageCode) => {
                const language = getLanguage(languageCode);
                const href = isSettingsPath
                    ? buildSettingsUrl(languageCode)
                    : buildHubUrl(languageCode);
                const activeClass =
                    languageCode === selectedLanguageCode ? " active" : "";
                return `
                    <li>
                        <a class="study-subnav-language-option${activeClass}" href="${escapeHtml(href)}">
                            ${escapeHtml(language.flag)}
                            <span>${escapeHtml(language.name)}</span>
                        </a>
                    </li>
                `;
            })
            .join("");

        const selectedLanguage = getLanguage(selectedLanguageCode);
        const settingsActiveClass = isSettingsPath ? " active" : "";
        const settingsUrl = buildSettingsUrl(selectedLanguageCode);

        return `
            <div class="study-page-subnav">
                <ul class="page-subnav-list study-subnav-modules">
                    ${moduleLinks}
                    <li>
                        <a
                            class="study-subnav-settings-link${settingsActiveClass}"
                            href="${escapeHtml(settingsUrl)}"
                            aria-label="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
                            title="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
                        >
                            ${SETTINGS_GEAR_SVG}
                        </a>
                    </li>
                </ul>
                <details class="study-subnav-language-dropdown">
                    <summary
                        class="study-subnav-language-current"
                        aria-label="${escapeHtml(i18n.t("gateway.study.active_languages"))}"
                    >
                        <span class="study-subnav-language-current-label">${escapeHtml(i18n.t("gateway.study.active_languages"))}:</span>
                        <span class="study-subnav-language-current-value">
                            ${escapeHtml(selectedLanguage.flag)}
                            <span>${escapeHtml(selectedLanguage.name)}</span>
                        </span>
                    </summary>
                    <ul class="study-subnav-language-options">${activeLanguageLinks}</ul>
                </details>
            </div>
        `;
    }

    function renderDashboardContent() {
        const cards = learningLanguages
            .map((languageCode) => {
                const language = getLanguage(languageCode);
                const modules = languageModulesMap.get(languageCode) ?? [];
                const moduleList =
                    modules.length === 0
                        ? `<span class="study-hub-no-modules">${escapeHtml(i18n.t("gateway.study.no_modules"))}</span>`
                        : modules
                              .map(
                                  (component) => `
                                    <a href="${escapeHtml(component.pageUrl)}" class="study-hub-module-link">
                                        ${escapeHtml(component.label)}
                                    </a>
                                `,
                              )
                              .join("");
                return `
                    <div class="study-hub-card-standalone">
                        <div class="study-hub-card-header">
                            <span class="study-hub-card-flag">${escapeHtml(language.flag)}</span>
                            <span class="study-hub-card-name">${escapeHtml(language.name)}</span>
                        </div>
                        <div class="study-hub-modules">${moduleList}</div>
                    </div>
                `;
            })
            .join("");

        return `
            <div class="study-hub-grid">${cards}</div>
        `;
    }

    function renderLanguageSettingRows(languageList, actionType) {
        const actionClass = actionType === "add" ? "btn-confirm" : "btn-cancel";
        const actionLabel =
            actionType === "add"
                ? i18n.t("ui.reuse.add")
                : i18n.t("ui.reuse.remove");

        return languageList
            .map((language) => {
                return `
                    <tr>
                        <td class="study-lang-settings-flag">${escapeHtml(language.flag)}</td>
                        <td class="study-lang-settings-name">${escapeHtml(language.name)}</td>
                        <td class="study-lang-settings-action">
                            <button
                                type="button"
                                class="study-lang-action-btn ${actionClass} btn-animated"
                                data-action="${escapeHtml(actionType)}"
                                data-code="${escapeHtml(language.code)}"
                            >
                                ${escapeHtml(actionLabel)}
                            </button>
                        </td>
                    </tr>
                `;
            })
            .join("");
    }

    function renderSettingsContent() {
        const availableLanguages = languageCatalog.filter(
            (language) => !learningLanguages.includes(language.code),
        );
        const activeLanguages = languageCatalog.filter((language) =>
            learningLanguages.includes(language.code),
        );
        const availableRows = renderLanguageSettingRows(
            availableLanguages,
            "add",
        );
        const activeRows = renderLanguageSettingRows(activeLanguages, "remove");
        const availableEmptyState =
            availableRows ||
            `<tr><td colspan="3" class="study-lang-settings-empty">${escapeHtml(i18n.t("gateway.study.no_languages"))}</td></tr>`;
        const activeEmptyState =
            activeRows ||
            `<tr><td colspan="3" class="study-lang-settings-empty">${escapeHtml(i18n.t("gateway.study.no_languages"))}</td></tr>`;

        return `
            <h3>${escapeHtml(i18n.t("gateway.study.language_settings"))}</h3>
            <div class="study-lang-settings-wrap">
                <div class="study-lang-settings-table">
                    <section class="study-lang-settings-column">
                        <h4>${escapeHtml(i18n.t("gateway.study.available_languages"))}</h4>
                        <table class="study-lang-settings-list">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>${escapeHtml(i18n.t("gateway.study.language"))}</th>
                                    <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
                                </tr>
                            </thead>
                            <tbody>${availableEmptyState}</tbody>
                        </table>
                    </section>
                    <section class="study-lang-settings-column">
                        <h4>${escapeHtml(i18n.t("gateway.study.active_languages"))}</h4>
                        <table class="study-lang-settings-list">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>${escapeHtml(i18n.t("gateway.study.language"))}</th>
                                    <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
                                </tr>
                            </thead>
                            <tbody>${activeEmptyState}</tbody>
                        </table>
                    </section>
                </div>
            </div>
        `;
    }

    const viewElement = isSettingsPath
        ? {
              id: "study-settings",
              label: i18n.t("gateway.study.language_settings"),
              pinned: true,
              gridSize: { default: [12, 8], min: [4, 4], max: "full" },
              render: renderSettingsContent,
              onRender: bindSettingsEvents,
          }
        : {
              id: "study-hub",
              label: i18n.t("gateway.study.page_title"),
              pinned: true,
              gridSize: { default: [12, 8], min: [4, 4], max: "full" },
              render: renderDashboardContent,
          };

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [viewElement],
        preferenceKey: isSettingsPath
            ? "study-settings-layout"
            : "study-hub-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.page_title"),
        },
        toolbar: [],
        subNavigation: [
            {
                id: "study-subnav",
                label: i18n.t("gateway.study.page_title"),
                render: renderSubNavigation,
            },
        ],
    });

    await composer.init();

    function bindSettingsEvents() {
        root.querySelectorAll(".study-lang-action-btn").forEach((button) => {
            button.addEventListener("click", async () => {
                const languageCode = String(button.dataset.code ?? "");
                const action = String(button.dataset.action ?? "");
                if (!languageCode) return;

                const updatedLearningLanguages =
                    action === "add"
                        ? [...new Set([...learningLanguages, languageCode])]
                        : learningLanguages.filter(
                              (code) => code !== languageCode,
                          );

                if (updatedLearningLanguages.length === 0) {
                    navigateTo("/study/welcome");
                    return;
                }

                button.disabled = true;
                try {
                    const response = await apiFetch(
                        "/api/v1/study/preferences",
                        {
                            method: "PUT",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                                learningLanguages: updatedLearningLanguages,
                                teachingLanguages: [],
                            }),
                        },
                    );
                    if (!response.ok) throw new Error("save_failed");
                    const targetLanguage = updatedLearningLanguages.includes(
                        selectedLanguageCode,
                    )
                        ? selectedLanguageCode
                        : updatedLearningLanguages[0];
                    navigateTo(buildSettingsUrl(targetLanguage));
                } catch {
                    showToast(i18n.t("ui.reuse.save_failed"), {
                        variant: "error",
                    });
                    button.disabled = false;
                }
            });
        });
    }
}

if (!globalThis.__spaRouter) {
    const appRoot = document.querySelector("#app");
    if (appRoot) await mount(appRoot);
}
