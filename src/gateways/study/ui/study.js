/**
 * Study hub — welcome onboarding and per-language sub-navigation dashboard.
 *
 * Serves two URL paths using a single HTML shell:
 *   /study/welcome — first-time language picker, full-width layout.
 *                    Redirects to /study if the user already has languages set.
 *   /study         — language hub with sub-page navigation.
 *                    Redirects to /study/welcome if no languages are saved.
 *
 * Public exports:
 *   mount(root, options) — mount the study page into the given root element.
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

const SETTINGS_GEAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>`;

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/study/languages"],
    });
    applyDocumentTitle(i18n, "gateway.study.page_title");

    const isWelcomePath = window.location.pathname === "/study/welcome";

    const [langResult, prefsResult] = await Promise.allSettled([
        apiFetch("/api/v1/study/registered-languages").then((response) =>
            response.ok ? response.json() : null,
        ),
        apiFetch("/api/v1/study/preferences").then((response) =>
            response.ok ? response.json() : null,
        ),
    ]);

    const registeredLanguages =
        langResult.status === "fulfilled" &&
        Array.isArray(langResult.value?.data)
            ? langResult.value.data
            : [];

    const learningLanguages =
        prefsResult.status === "fulfilled" &&
        Array.isArray(prefsResult.value?.data?.learningLanguages)
            ? prefsResult.value.data.learningLanguages
            : [];

    if (isWelcomePath) {
        if (learningLanguages.length > 0) {
            navigateTo("/study");
            return;
        }
        await mountWelcome(root, { i18n, registeredLanguages, signal });
    } else {
        if (learningLanguages.length === 0) {
            navigateTo("/study/welcome");
            return;
        }
        await mountHub(root, {
            i18n,
            registeredLanguages,
            learningLanguages,
            signal,
        });
    }
}

async function mountWelcome(root, { i18n, registeredLanguages }) {
    const selectedForPicker = new Set();

    function renderWelcomeContent() {
        const cards =
            registeredLanguages.length === 0
                ? `<p class="study-empty">${escapeHtml(i18n.t("gateway.study.no_languages"))}</p>`
                : registeredLanguages
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
                        ${selectedForPicker.size === 0 ? "disabled" : ""}
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
        pageContext: { title: i18n.t("gateway.study.page_title") },
        toolbar: [],
    });
    await composer.init();

    function bindWelcomeEvents() {
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
    { i18n, registeredLanguages, learningLanguages },
) {
    const languageModulesMap = new Map();

    async function loadModulesForLanguage(code) {
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
            } else {
                languageModulesMap.set(code, []);
            }
        } catch {
            languageModulesMap.set(code, []);
        }
    }

    await Promise.allSettled(
        learningLanguages.map((code) => loadModulesForLanguage(code)),
    );

    function findLang(code) {
        return registeredLanguages.find((lang) => lang.code === code);
    }

    function renderLangHub(code) {
        const lang = findLang(code);
        const modules = languageModulesMap.get(code) ?? [];
        const moduleLinks =
            modules.length === 0
                ? `<span class="study-hub-no-modules">${escapeHtml(i18n.t("gateway.study.no_modules"))}</span>`
                : modules
                      .map(
                          (mod) => `
                    <a href="${escapeHtml(mod.pageUrl)}" class="study-hub-module-link">
                        ${escapeHtml(mod.label)}
                    </a>
                `,
                      )
                      .join("");

        return `
            <div class="study-hub-card-standalone">
                <div class="study-hub-card-header">
                    <span class="study-hub-card-flag">${escapeHtml(lang?.flag || "")}</span>
                    <span class="study-hub-card-name">${escapeHtml(lang?.name || code)}</span>
                </div>
                <div class="study-hub-modules">${moduleLinks}</div>
            </div>
        `;
    }

    function renderLangSettings() {
        const rows = registeredLanguages
            .map((lang) => {
                const isLearning = learningLanguages.includes(lang.code);
                const actionButton = isLearning
                    ? `<button
                            type="button"
                            class="study-lang-action-btn btn-cancel btn-animated"
                            data-action="remove"
                            data-code="${escapeHtml(lang.code)}"
                        >${escapeHtml(i18n.t("ui.reuse.remove"))}</button>`
                    : `<button
                            type="button"
                            class="study-lang-action-btn btn-confirm btn-animated"
                            data-action="add"
                            data-code="${escapeHtml(lang.code)}"
                        >${escapeHtml(i18n.t("ui.reuse.add"))}</button>`;
                return `
                    <tr>
                        <td class="study-lang-settings-flag">${escapeHtml(lang.flag || "")}</td>
                        <td class="study-lang-settings-name">${escapeHtml(lang.name || lang.code)}</td>
                        <td class="study-lang-settings-action">${actionButton}</td>
                    </tr>
                `;
            })
            .join("");

        return `
            <h3>${escapeHtml(i18n.t("gateway.study.language_settings"))}</h3>
            <div class="study-lang-settings-wrap">
                <table class="study-lang-settings-table">
                    <thead>
                        <tr>
                            <th></th>
                            <th>${escapeHtml(i18n.t("gateway.study.language"))}</th>
                            <th>${escapeHtml(i18n.t("ui.reuse.actions"))}</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function buildElements() {
        return [
            ...learningLanguages.map((code) => {
                const lang = findLang(code);
                return {
                    id: `lang-${code}`,
                    label: lang?.name || code,
                    pinned: true,
                    gridSize: { default: [6, 4], min: [2, 2], max: "full" },
                    render: () => renderLangHub(code),
                    onRender: bindLangHubEvents,
                };
            }),
            {
                id: "lang-settings",
                label: i18n.t("gateway.study.language_settings"),
                pinned: true,
                gridSize: { default: [6, 4], min: [3, 2], max: "full" },
                render: renderLangSettings,
                onRender: bindLangSettingsEvents,
            },
        ];
    }

    function buildToolbarItems() {
        const langButtons = learningLanguages
            .map((code) => {
                const lang = findLang(code);
                return `<li><button data-composer-scroll="lang-${escapeHtml(code)}">${escapeHtml(lang?.flag || "")} ${escapeHtml(lang?.name || code)}</button></li>`;
            })
            .join("");

        return [
            {
                id: "study-nav",
                label: i18n.t("gateway.study.page_title"),
                render: () => `
                    <h2>${escapeHtml(i18n.t("gateway.study.page_title"))}</h2>
                    <ul>${langButtons}</ul>
                    <div class="study-nav-settings-row">
                        <button
                            type="button"
                            data-composer-scroll="lang-settings"
                            class="study-settings-cog-btn"
                            aria-label="${escapeHtml(i18n.t("gateway.study.language_settings"))}"
                        >
                            ${SETTINGS_GEAR_SVG}
                            <span>${escapeHtml(i18n.t("gateway.study.language_settings"))}</span>
                        </button>
                    </div>
                `,
            },
        ];
    }

    const composer = createPageComposer(root, {
        allowCustomization: false,
        subPageNavigation: true,
        elements: buildElements(),
        preferenceKey: "study-hub-layout",
        i18n,
        pageContext: { title: i18n.t("gateway.study.page_title") },
        toolbar: buildToolbarItems(),
    });
    await composer.init();

    function bindLangHubEvents() {
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

    function bindLangSettingsEvents() {
        root.querySelectorAll(".study-lang-action-btn").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const code = btn.dataset.code;
                const action = btn.dataset.action;
                if (!code) return;

                btn.disabled = true;

                const updatedLearning =
                    action === "add"
                        ? [...learningLanguages, code]
                        : learningLanguages.filter((c) => c !== code);

                try {
                    const response = await apiFetch(
                        "/api/v1/study/preferences",
                        {
                            method: "PUT",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                                learningLanguages: updatedLearning,
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
                    btn.disabled = false;
                }
            });
        });
    }
}

if (!globalThis.__spaRouter) {
    const appRoot = document.querySelector("#app");
    if (appRoot) await mount(appRoot);
}
