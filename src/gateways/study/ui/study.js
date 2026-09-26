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
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";
import {
    bindStudySubNavigation,
    clearStudySubNavCache,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import {
    resolveLanguageLabel,
    isStudentScope,
    buildLibraryUrl,
} from "/static/gateways/study/ui/language.js";
import { openPopup } from "/static/reuse/popup.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

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
    const requestedLanguageCode = readSelectedStudyLanguageCode();
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

    if (registeredLanguages.length === 0) {
        await navigateTo("/error?code=503");
        return;
    }

    const storedLearningLanguages =
        prefsResult.status === "fulfilled" &&
        Array.isArray(prefsResult.value?.data?.learningLanguages)
            ? [...new Set(prefsResult.value.data.learningLanguages)]
            : [];
    const registeredLanguageCodes = new Set(
        registeredLanguages.map(({ code }) => code),
    );
    const learningLanguages = storedLearningLanguages.filter((languageCode) =>
        registeredLanguageCodes.has(languageCode),
    );

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
        requestedLanguageCode,
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
            subtitle: i18n.t("gateway.study.page_subtitle"),
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
                    clearStudySubNavCache();
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
    {
        i18n,
        registeredLanguages,
        learningLanguages,
        requestedLanguageCode,
        isSettingsPath,
        signal,
    },
) {
    const selectedLanguageCode = learningLanguages.includes(
        requestedLanguageCode,
    )
        ? requestedLanguageCode
        : learningLanguages[0];
    const navigationModel = await loadStudySubNavigationModel({
        fallbackLanguageCode: selectedLanguageCode,
    });

    const subPages = uiCtx.capabilities.get("study:subPages");
    if (!subPages) throw new Error("Study sub-page provider unavailable.");
    const subPageModel = await subPages.load("study", {
        selectedGroupId: selectedLanguageCode,
        groupIds: learningLanguages,
    });
    const languageModulesMap = subPageModel.pagesByGroup;

    const languageByCode = new Map();
    for (const language of registeredLanguages) {
        languageByCode.set(language.code, language);
    }
    const languageCatalog = Array.from(languageByCode.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );

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
        const rememberedPageUrl = [
            history.state?.studyLastPageUrl,
            history.state?.previousRouterPage,
        ].find(
            (path) =>
                typeof path === "string" &&
                path.startsWith("/study/") &&
                !["/study/settings", "/study/welcome"].includes(path),
        );
        if (rememberedPageUrl) return rememberedPageUrl;
        const modules = languageModulesMap.get(languageCode) ?? [];
        const firstModulePageUrl = modules
            .map((component) => String(component?.pageUrl ?? "").trim())
            .find(Boolean);
        return firstModulePageUrl || "/study";
    }

    function buildSettingsUrl() {
        return "/study/settings";
    }

    function renderSubNavigation() {
        return renderStudySubNavigation({
            model: navigationModel,
            currentPath: window.location.pathname,
            i18n,
        });
    }

    function renderDashboardContent() {
        const cards = learningLanguages
            .map((languageCode) => {
                const language = getLanguage(languageCode);
                const executableModules =
                    languageModulesMap.get(languageCode) ?? [];
                const modules =
                    executableModules.length === 0 && isStudentScope()
                        ? [
                              {
                                  label: i18n.t("gateway.study.library_label"),
                                  pageUrl: buildLibraryUrl(languageCode),
                              },
                          ]
                        : executableModules;
                const moduleList =
                    modules.length === 0
                        ? `<span class="study-hub-no-modules">${escapeHtml(i18n.t("gateway.study.no_modules"))}</span>`
                        : modules
                              .map(
                                  (component) => `
                                    <a href="${escapeHtml(component.pageUrl)}" class="study-hub-module-link" data-search-category="${escapeHtml(i18n.t("gateway.study.page_title"))}" data-search-label="${escapeHtml(component.label)}" data-search-description="${escapeHtml(language.name)}" data-search-text="${escapeHtml([i18n.t("gateway.study.page_title"), language.name, component.label].filter(Boolean).join(" "))}">
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

    function collectStudySearchGroups() {
        const items = [];
        for (const languageCode of learningLanguages) {
            const language = getLanguage(languageCode);
            const languageName = language.name || languageCode;
            items.push({
                id: `study-language:${languageCode}`,
                label: [i18n.t("gateway.study.page_title"), languageName].join(
                    " / ",
                ),
                description: i18n.t("gateway.study.page_title"),
                url: buildHubUrl(languageCode),
                resultClass: "page",
                searchText: [
                    i18n.t("gateway.study.page_title"),
                    languageName,
                    languageCode,
                ]
                    .filter(Boolean)
                    .join(" "),
            });
            for (const component of languageModulesMap.get(languageCode) ??
                []) {
                const pageUrl = String(component?.pageUrl ?? "").trim();
                const label = String(component?.label ?? pageUrl).trim();
                if (!pageUrl || !label) continue;
                items.push({
                    id: `study-module:${languageCode}:${component?.id ?? label}`,
                    label: [
                        i18n.t("gateway.study.page_title"),
                        languageName,
                        label,
                    ].join(" / "),
                    description: [
                        i18n.t("gateway.study.page_title"),
                        languageName,
                    ].join(" / "),
                    url: pageUrl,
                    resultClass: "page",
                    searchText: [
                        i18n.t("gateway.study.page_title"),
                        languageName,
                        label,
                        component?.id,
                    ]
                        .filter(Boolean)
                        .join(" "),
                });
            }
        }
        items.push({
            id: "study-settings",
            label: [
                i18n.t("gateway.study.page_title"),
                i18n.t("gateway.study.language_settings"),
            ].join(" / "),
            description: i18n.t("gateway.study.page_title"),
            url: buildSettingsUrl(),
            resultClass: "setting",
            searchText: [
                i18n.t("gateway.study.page_title"),
                i18n.t("gateway.study.language_settings"),
            ].join(" "),
        });
        return items.length ? [{ category: "Pages", items }] : [];
    }

    registerSearchIndex("study-contents", collectStudySearchGroups);

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
            subtitle: isSettingsPath
                ? i18n.t("gateway.study.settings_subtitle")
                : i18n.t("gateway.study.page_subtitle"),
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
    bindStudySubNavigation(root, { signal });

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
                    const confirmationAction = await openPopup({
                        title: i18n.t(
                            "gateway.study.remove_last_language_title",
                        ),
                        body: `<p>${escapeHtml(i18n.t("gateway.study.remove_last_language_body"))}</p>`,
                        variant: "warning",
                        actions: [
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "cancel",
                            },
                            {
                                id: "confirm",
                                label: i18n.t("ui.reuse.confirm"),
                                variant: "confirm",
                            },
                        ],
                    });
                    if (confirmationAction !== "confirm") {
                        return;
                    }
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
                    clearStudySubNavCache();
                    navigateTo(buildSettingsUrl());
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

await mountWhenDirect(mount).catch((error) => {
    console.error("[study] mount failed", error);
});
