/**
 * Study hub — language selection and module navigation.
 *
 * Renders a welcome/onboarding screen when the user has no learning languages
 * saved. Once languages are chosen the hub view shows each selected language
 * with links to its registered study modules.
 *
 * Public exports:
 *   mount(root, options) — initialise the study hub page into the given root.
 *
 * Usage:
 *   import { mount } from '/static/gateways/study/study.js';
 *   await mount(document.querySelector('#app'));
 *
 * @param {HTMLElement} root — the #app element.
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<void>}
 */

import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/study/languages"],
    });
    applyDocumentTitle(i18n, "ui.app.study.page_title");

    let availableLanguages = [];
    let learningLanguages = [];
    const languageModulesMap = new Map();
    let selectedForPicker = new Set();
    let viewMode = "welcome";

    async function loadPreferences() {
        const [languagesResult, prefsResult] = await Promise.allSettled([
            apiFetch("/api/v1/study/languages").then((response) =>
                response.ok ? response.json() : null,
            ),
            apiFetch("/api/v1/study/preferences").then((response) =>
                response.ok ? response.json() : null,
            ),
        ]);
        if (
            languagesResult.status === "fulfilled" &&
            Array.isArray(languagesResult.value?.data)
        ) {
            availableLanguages = languagesResult.value.data;
        }
        if (
            prefsResult.status === "fulfilled" &&
            Array.isArray(prefsResult.value?.data?.learningLanguages)
        ) {
            learningLanguages = prefsResult.value.data.learningLanguages;
        }
    }

    async function loadModules() {
        languageModulesMap.clear();
        await Promise.allSettled(
            learningLanguages.map(async (code) => {
                try {
                    const response = await apiFetch(
                        `/api/v1/study/languages/${encodeURIComponent(code)}/modules`,
                    );
                    if (response.ok) {
                        const payload = await response.json();
                        languageModulesMap.set(
                            code,
                            Array.isArray(payload?.data) ? payload.data : [],
                        );
                    }
                } catch {
                    languageModulesMap.set(code, []);
                }
            }),
        );
    }

    await loadPreferences();
    viewMode = learningLanguages.length === 0 ? "welcome" : "hub";
    selectedForPicker = new Set(learningLanguages);
    if (viewMode === "hub") await loadModules();

    function renderPickerContent() {
        const cards =
            availableLanguages.length === 0
                ? `<p class="study-empty">${escapeHtml(i18n.t("ui.app.study.no_languages"))}</p>`
                : availableLanguages
                      .map(
                          (lang, index) => `
                        <button
                            type="button"
                            class="study-lang-card${selectedForPicker.has(lang.code) ? " selected" : ""}"
                            data-lang-code="${escapeHtml(lang.code)}"
                            style="animation-delay: ${(0.55 + index * 0.06).toFixed(2)}s"
                        >
                            <span class="study-lang-flag">${escapeHtml(lang.flag || "")}</span>
                            <span class="study-lang-name">${escapeHtml(lang.name || lang.code)}</span>
                        </button>
                    `,
                      )
                      .join("");
        return `
            <div class="study-welcome">
                <div class="study-welcome-hero">
                    <span class="study-welcome-icon study-bounce-in">🎓</span>
                    <h1 class="study-welcome-heading study-fade-in-up" style="animation-delay: 0.1s">
                        ${escapeHtml(i18n.t("ui.app.study.welcome_heading"))}
                    </h1>
                    <p class="study-welcome-tagline study-fade-in-up" style="animation-delay: 0.25s">
                        ${escapeHtml(i18n.t("ui.app.study.welcome_tagline"))}
                    </p>
                    <p class="study-welcome-prompt study-fade-in-up" style="animation-delay: 0.4s">
                        ${escapeHtml(i18n.t("ui.app.study.welcome_prompt"))}
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
                        ${selectedForPicker.size === 0 ? "disabled" : ""}
                    >
                        ${escapeHtml(i18n.t("ui.app.study.start"))}
                    </button>
                </div>
            </div>
        `;
    }

    function renderHubContent() {
        const cards = learningLanguages
            .map((code) => {
                const lang = availableLanguages.find(
                    (language) => language.code === code,
                );
                const modules = languageModulesMap.get(code) ?? [];
                const flagText = escapeHtml(lang?.flag || "");
                const nameText = escapeHtml(lang?.name || code);
                const moduleLinks =
                    modules.length === 0
                        ? `<span class="study-hub-no-modules">${escapeHtml(i18n.t("ui.app.study.no_modules"))}</span>`
                        : modules
                              .map(
                                  (mod) =>
                                      `<a href="${escapeHtml(mod.pageUrl)}" class="study-hub-module-link">${escapeHtml(mod.label)}</a>`,
                              )
                              .join("");
                return `
                <div class="study-hub-card">
                    <div class="study-hub-card-header">
                        <span class="study-hub-card-flag">${flagText}</span>
                        <span class="study-hub-card-name">${nameText}</span>
                    </div>
                    <div class="study-hub-modules">${moduleLinks}</div>
                </div>
            `;
            })
            .join("");
        return `
            <div class="study-hub-header">
                <h2 class="study-hub-heading">${escapeHtml(i18n.t("ui.app.study.your_languages"))}</h2>
                <button type="button" id="study-change-languages" class="btn-cancel btn-animated">
                    ${escapeHtml(i18n.t("ui.app.study.change_languages"))}
                </button>
            </div>
            <div class="study-hub-grid">${cards}</div>
        `;
    }

    function getElements() {
        if (viewMode === "welcome") {
            return [
                {
                    id: "study-picker",
                    label: i18n.t("ui.app.study.page_title"),
                    pinned: true,
                    render: renderPickerContent,
                    onRender: bindPickerEvents,
                },
            ];
        }
        return [
            {
                id: "study-hub",
                label: i18n.t("ui.app.study.your_languages"),
                pinned: true,
                render: renderHubContent,
                onRender: bindHubEvents,
            },
        ];
    }

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: getElements(),
        preferenceKey: "study-layout",
        i18n,
        pageContext: {
            title: i18n.t("ui.app.study.page_title"),
        },
        toolbar: [],
    });
    await composer.init();

    function bindPickerEvents() {
        root.querySelectorAll(".study-lang-card").forEach((card) => {
            card.addEventListener("click", () => {
                const code = card.dataset.langCode;
                if (selectedForPicker.has(code)) {
                    selectedForPicker.delete(code);
                    card.classList.remove("selected");
                } else {
                    selectedForPicker.add(code);
                    card.classList.add("selected");
                }
                const startBtn = root.querySelector("#study-start-btn");
                if (startBtn) {
                    startBtn.disabled = selectedForPicker.size === 0;
                }
            });
        });

        root.querySelector("#study-start-btn")?.addEventListener(
            "click",
            async () => {
                const learningList = [...selectedForPicker];
                try {
                    const response = await apiFetch(
                        "/api/v1/study/preferences",
                        {
                            method: "PUT",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                                learningLanguages: learningList,
                                teachingLanguages: [],
                            }),
                        },
                    );
                    if (!response.ok) throw new Error("save_failed");
                    learningLanguages = learningList;
                    await loadModules();
                    viewMode = "hub";
                    composer.refresh(getElements());
                } catch {
                    showToast(i18n.t("ui.reuse.save_failed"), {
                        variant: "error",
                    });
                }
            },
        );
    }

    function bindHubEvents() {
        root.querySelector("#study-change-languages")?.addEventListener(
            "click",
            () => {
                selectedForPicker = new Set(learningLanguages);
                viewMode = "welcome";
                composer.refresh(getElements());
            },
        );

        root.querySelectorAll(".study-hub-module-link").forEach((link) => {
            link.addEventListener("click", (event) => {
                const href = link.getAttribute("href");
                if (href) {
                    event.preventDefault();
                    navigateTo(href);
                }
            });
        });
    }
}

if (!globalThis.__spaRouter) {
    const appRoot = document.querySelector("#app");
    if (appRoot) await mount(appRoot);
}
