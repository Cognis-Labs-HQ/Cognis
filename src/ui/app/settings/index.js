import { applyUiPreferences } from "../../reuse/ui-preferences.js";
import { apiFetch } from "../../reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    readPreferredLanguages,
    setPreferredLanguages,
} from "../../reuse/i18n.js";
import {
    applyTheme,
    persistTheme,
    getStoredTheme,
} from "../../reuse/theme-toggle.js";
import {
    toFontFamilyValue,
    initFontPrefs,
    DEFAULT_FONT_SIZE,
} from "../../reuse/font-prefs.js";
import { initLanguagePrefs } from "./language-prefs.js";
import { initGeneralPrefs } from "./general-prefs.js";
import { initNotificationPrefs } from "./notification-prefs.js";
import { initDateTimePrefs } from "./datetime-prefs.js";
import { initStudyPrefs } from "./study-prefs.js";
import { applyTimezoneToLocalStorage } from "../../reuse/timestamp.js";
import { createUnsavedChangesBar } from "../../reuse/unsaved-changes.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { showToast } from "../../reuse/toast.js";

async function loadPrefs() {
    const account = localStorage.getItem("cognis_account");
    if (!account) return null;
    const response = await apiFetch(
        `/api/v1/users/${encodeURIComponent(account)}/preferences/ui-preferences`,
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const raw = payload?.data?.layoutJson;
    return raw ? JSON.parse(raw) : null;
}

async function savePrefs(prefs) {
    const account = localStorage.getItem("cognis_account");
    if (!account) return;
    await apiFetch(
        `/api/v1/users/${encodeURIComponent(account)}/preferences/ui-preferences`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ layout: prefs }),
        },
    );
}

async function isStudyGatewayAvailable() {
    try {
        const response = await apiFetch("/api/v1/study/languages");
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Returns true when the language priority order has changed between
 * two saves, indicating a page reload is required to apply new strings.
 *
 * @param {string[]} prev - Previously committed language priority list.
 * @param {string[]} next - Newly saved language priority list.
 * @returns {boolean}
 */
function hasLanguagePriorityChanged(prev, next) {
    if (prev.length !== next.length) return true;
    return next.some((lang, i) => lang !== prev[i]);
}

const LANGUAGE_RELOAD_DELAY_MS = 400;

export async function mount(root, { signal } = {}) {
    let loadedPrefs = await loadPrefs().catch(() => null);
    let languagePriority = Array.isArray(loadedPrefs?.languagePriority)
        ? loadedPrefs.languagePriority
        : readPreferredLanguages();
    const i18n = await createI18n({ preferredLanguages: languagePriority });
    applyDocumentTitle(i18n, "ui.page.title.settings");

    applyTimezoneToLocalStorage(
        loadedPrefs?.timezone ?? null,
        loadedPrefs?.detectedTimezone ?? null,
    );
    const studyGatewayAvailable = await isStudyGatewayAvailable();

    let savedMode = getStoredTheme();

    let fontPrefs;
    let languagePrefs;
    let themePrefs;
    let changesBar;
    let generalPrefs;
    let notifPrefs;
    let datetimePrefs;
    let studyPrefs;

    function initThemePrefs({ onDirtyChange }) {
        let currentMode = savedMode;

        function updateSelector() {
            root.querySelectorAll(".theme-btn[data-theme-value]").forEach(
                (btn) => {
                    btn.classList.toggle(
                        "active",
                        btn.dataset.themeValue === currentMode,
                    );
                },
            );
        }

        root.querySelectorAll(".theme-btn[data-theme-value]").forEach((btn) => {
            btn.addEventListener("click", () => {
                currentMode = btn.dataset.themeValue;
                updateSelector();
                onDirtyChange?.(currentMode !== savedMode);
            });
        });

        updateSelector();

        return {
            getMode: () => currentMode,
            commit: () => {
                savedMode = currentMode;
            },
            discard: () => {
                currentMode = savedMode;
                updateSelector();
                onDirtyChange?.(false);
            },
        };
    }

    const elements = [
        {
            id: "general",
            label: i18n.t("ui.app.settings.general"),
            subComposerOptions: {
                allowCustomization: false,
                preferenceKey: "settings-general-layout",
                heading: i18n.t("ui.app.settings.general"),
                elements: [
                    {
                        id: "general-prefs",
                        label: i18n.t("ui.app.settings.general"),
                        render: () => `
            <h3>${i18n.t("ui.app.settings.emails")}</h3>
            <ul id="email-list" class="email-list"></ul>
            <div class="email-add-row">
              <input id="email-add-input" type="email" placeholder="${i18n.t("ui.app.settings.emails_add_placeholder")}" />
              <button id="email-add-btn" class="btn-confirm btn-animated" type="button">${i18n.t("ui.app.settings.emails_add")}</button>
            </div>
          `,
                    },
                ],
                onRender: () => {
                    const account =
                        localStorage.getItem("cognis_account") ?? "";
                    if (!generalPrefs) {
                        generalPrefs = initGeneralPrefs(root, {
                            i18n,
                            username: account,
                        });
                        generalPrefs.init();
                    } else {
                        generalPrefs.refresh();
                    }
                },
            },
        },
        {
            id: "appearance",
            label: i18n.t("ui.reuse.appearance"),
            subComposerOptions: {
                allowCustomization: false,
                preferenceKey: "settings-appearance-layout",
                heading: i18n.t("ui.reuse.appearance"),
                elements: [
                    {
                        id: "appearance-prefs",
                        label: i18n.t("ui.reuse.appearance"),
                        render: () => `
            <div class="font-heading-row">
              <h3>${i18n.t("ui.app.settings.font")}</h3>
              <button id="pref-font-reset" type="button" disabled>${i18n.t("ui.reuse.generic.reset")}</button>
            </div>
            <div class="font-picker-row">
              <label class="font-picker-label">
                ${i18n.t("ui.app.settings.font")}
                <div id="pref-font-picker"></div>
              </label>
              <div class="font-size-stepper">
                <button id="pref-font-size-up" class="font-size-btn" type="button" aria-label="${i18n.t("ui.app.settings.font_size")} +">▲</button>
                <span id="pref-font-size-value">${DEFAULT_FONT_SIZE} pt</span>
                <button id="pref-font-size-down" class="font-size-btn" type="button" aria-label="${i18n.t("ui.app.settings.font_size")} -">▼</button>
              </div>
            </div>
            <div class="font-preview-box">
              <h4>${i18n.t("ui.app.settings.font_preview")}</h4>
              <span id="pref-font-preview">${i18n.t("ui.app.settings.font_preview_sample")}</span>
            </div>
            <div class="theme-subsection">
              <h3>${i18n.t("ui.app.settings.theme")}</h3>
              <div class="theme-selector" id="pref-theme-selector">
                <button type="button" class="theme-btn" data-theme-value="dark">${i18n.t("ui.app.settings.theme_dark")}</button>
                <button type="button" class="theme-btn" data-theme-value="light">${i18n.t("ui.app.settings.theme_light")}</button>
              </div>
            </div>
          `,
                    },
                ],
                onRender: () => {
                    fontPrefs = initFontPrefs(root, {
                        existingPrefs: loadedPrefs,
                        i18n,
                        onDirtyChange: (dirty) =>
                            changesBar?.markDirty("font", dirty),
                    });
                    fontPrefs.init();
                    themePrefs = initThemePrefs({
                        onDirtyChange: (dirty) =>
                            changesBar?.markDirty("theme", dirty),
                    });
                },
            },
        },
        {
            id: "language",
            label: i18n.t("ui.reuse.language"),
            subComposerOptions: {
                allowCustomization: false,
                preferenceKey: "settings-language-layout",
                columns: 2,
                heading: i18n.t("ui.reuse.language"),
                elements: [
                    {
                        id: "available-languages",
                        label: i18n.t("ui.app.settings.available_languages"),
                        render: () => `
            <h3>${i18n.t("ui.app.settings.available_languages")}</h3>
            <table id="available-languages" class="language-table"></table>
          `,
                    },
                    {
                        id: "preferred-languages",
                        label: i18n.t("ui.app.settings.preferred_languages"),
                        render: () => `
            <h3>${i18n.t("ui.app.settings.preferred_languages")}</h3>
            <table id="preferred-languages" class="language-table"></table>
          `,
                    },
                ],
                onRender: () => {
                    if (!languagePrefs) {
                        languagePrefs = initLanguagePrefs(
                            root,
                            languagePriority,
                            {
                                onDirtyChange: (dirty) =>
                                    changesBar?.markDirty("language", dirty),
                            },
                        );
                        languagePrefs.init();
                    } else {
                        languagePrefs.renderTables();
                    }
                },
            },
        },
        {
            id: "notifications",
            label: i18n.t("ui.reuse.notifications"),
            subComposerOptions: {
                allowCustomization: false,
                preferenceKey: "settings-notifications-layout",
                heading: i18n.t("ui.reuse.notifications"),
                elements: [
                    {
                        id: "notif-matrix",
                        label: i18n.t("ui.app.settings.notif_matrix_heading"),
                        render: () => `<div id="notif-matrix-container"></div>`,
                    },
                ],
                onRender: () => {
                    const account =
                        localStorage.getItem("cognis_account") ?? "";
                    notifPrefs = initNotificationPrefs(root, {
                        i18n,
                        username: account,
                        onDirtyChange: (dirty) =>
                            changesBar?.markDirty("notifications", dirty),
                    });
                    notifPrefs.init();
                },
            },
        },

        ...(studyGatewayAvailable
            ? [
                  {
                      id: "study",
                      label: i18n.t("ui.app.settings.study.title"),
                      subComposerOptions: {
                          allowCustomization: false,
                          preferenceKey: "settings-study-layout",
                          heading: i18n.t("ui.app.settings.study.title"),
                          elements: [
                              {
                                  id: "study-prefs",
                                  label: i18n.t("ui.app.settings.study.title"),
                                  render: () =>
                                      `<div id="study-prefs-container"></div>`,
                              },
                          ],
                          onRender: () => {
                              studyPrefs = initStudyPrefs(root, {
                                  i18n,
                                  onDirtyChange: (dirty) =>
                                      changesBar?.markDirty("study", dirty),
                              });
                              studyPrefs.init();
                          },
                      },
                  },
              ]
            : []),
        {
            id: "datetime",
            label: i18n.t("ui.app.settings.datetime"),
            subComposerOptions: {
                allowCustomization: false,
                preferenceKey: "settings-datetime-layout",
                heading: i18n.t("ui.app.settings.datetime"),
                elements: [
                    {
                        id: "datetime-prefs",
                        label: i18n.t("ui.app.settings.datetime"),
                        render: () => `
            <h3>${i18n.t("ui.app.settings.datetime_tz_heading")}</h3>
            <label class="timezone-label">
              ${i18n.t("ui.app.settings.datetime_tz_label")}
              <select id="pref-timezone-select" class="theme-select"></select>
            </label>
          `,
                    },
                ],
                onRender: () => {
                    datetimePrefs = initDateTimePrefs(root, {
                        existingPrefs: loadedPrefs,
                        i18n,
                        onDirtyChange: (dirty) =>
                            changesBar?.markDirty("datetime", dirty),
                    });
                    datetimePrefs.init();
                },
            },
        },
        {
            id: "advanced",
            label: i18n.t("ui.app.settings.advanced"),
            subComposerOptions: {
                allowCustomization: false,
                preferenceKey: "settings-advanced-layout",
                heading: i18n.t("ui.app.settings.advanced"),
                elements: [
                    {
                        id: "prefs-dump",
                        label: i18n.t("ui.app.settings.preferences"),
                        pinned: true,
                        render: () => `
            <h3>${i18n.t("ui.app.settings.preferences")}</h3>
            <pre id="prefs-dump" class="prefs-dump">${i18n.t("ui.app.settings.prefs_loading")}</pre>
          `,
                    },
                ],
                onRender: () => {
                    const prefsDumpEl = root.querySelector("#prefs-dump");
                    if (prefsDumpEl) {
                        prefsDumpEl.textContent =
                            loadedPrefs != null
                                ? JSON.stringify(loadedPrefs, null, 2)
                                : "null";
                    }
                },
            },
        },
    ];

    const composer = createPageComposer(root, {
        allowCustomization: false,
        subPageNavigation: true,
        elements,
        preferenceKey: "settings-layout",
        i18n,
        pageContext: {
            title: i18n.t("ui.app.settings.page_title"),
            subtitle: i18n.t("ui.app.settings.page_subtitle"),
        },
        pageOverrides: {
            appearance: { showThemeToggle: false },
        },
        toolbar: [
            {
                id: "settings-nav",
                label: i18n.t("ui.app.settings.page_title"),
                render: () => `
      <h2>${i18n.t("ui.app.settings.page_title")}</h2>
      <ul>
        <li><button data-composer-scroll="general">${i18n.t("ui.app.settings.general")}</button></li>
        <li><button data-composer-scroll="appearance">${i18n.t("ui.reuse.appearance")}</button></li>
        <li><button data-composer-scroll="language">${i18n.t("ui.reuse.language")}</button></li>
        <li><button data-composer-scroll="notifications">${i18n.t("ui.reuse.notifications")}</button></li>
        ${studyGatewayAvailable ? `<li><button data-composer-scroll="study">${i18n.t("ui.app.settings.study.title")}</button></li>` : ""}
        <li><button data-composer-scroll="datetime">${i18n.t("ui.app.settings.datetime")}</button></li>
        <li><button data-composer-scroll="advanced">${i18n.t("ui.app.settings.advanced")}</button></li>
      </ul>
    `,
            },
        ],
        floatingMenu: [
            {
                id: "settings-changes-bar",
                label: i18n.t("ui.reuse.unsaved_changes"),
                render: () => `
      <span>${i18n.t("ui.reuse.unsaved_changes")}</span>
      <button class="btn-cancel btn-animated" type="button" data-action="discard">${i18n.t("ui.reuse.generic.discard")}</button>
      <button class="btn-confirm btn-animated" type="button" data-action="save">${i18n.t("ui.reuse.generic.save")}</button>
    `,
            },
        ],
    });
    await composer.init();

    const floatingSlot = composer.getFloatingSlot("settings-changes-bar");

    changesBar = createUnsavedChangesBar(floatingSlot, {
        onSave: async () => {
            const mode = themePrefs?.getMode() ?? savedMode;
            const account = localStorage.getItem("cognis_account") ?? "";
            if (notifPrefs?.isDirty()) {
                await apiFetch(
                    `/api/v1/users/${encodeURIComponent(account)}/notification-prefs`,
                    {
                        method: "PUT",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(notifPrefs.getPendingPrefs()),
                    },
                );
            }
            if (studyPrefs?.isDirty()) {
                await apiFetch("/api/v1/study/preferences", {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(studyPrefs.getPendingPrefs()),
                });
            }
            const prefs = {
                appFont: fontPrefs
                    ? toFontFamilyValue(fontPrefs.getFont())
                    : loadedPrefs?.appFont,
                appFontSize:
                    fontPrefs?.getFontSize() ?? loadedPrefs?.appFontSize,
                languagePriority:
                    languagePrefs?.getPriority() ?? languagePriority,
                mode,
                timezone:
                    datetimePrefs?.getTimezone() ??
                    loadedPrefs?.timezone ??
                    "auto",
            };
            await savePrefs(prefs);
            loadedPrefs = { ...loadedPrefs, ...prefs };
            persistTheme(mode);
            applyTheme(mode);
            setPreferredLanguages(prefs.languagePriority);
            applyTimezoneToLocalStorage(prefs.timezone ?? null, null);
            localStorage.setItem(
                "cognis_ui_preferences",
                JSON.stringify(prefs),
            );
            applyUiPreferences(prefs); // apply font/theme/timezone to live page without reload
            fontPrefs?.commit();
            themePrefs?.commit();
            datetimePrefs?.commit();
            languagePrefs?.commit();
            notifPrefs?.commit();
            studyPrefs?.commit();
            showToast(i18n.t("ui.app.settings.saved_alert"), {
                variant: "success",
            });
            const next = prefs.languagePriority ?? [];
            const prev = languagePriority ?? [];
            if (hasLanguagePriorityChanged(prev, next)) {
                // Brief pause so the success toast is visible before the page
                // reloads (see LANGUAGE_RELOAD_DELAY_MS).
                await new Promise((resolve) =>
                    setTimeout(resolve, LANGUAGE_RELOAD_DELAY_MS),
                );
                window.location.reload();
            }
        },
        onDiscard: () => {
            fontPrefs?.discard();
            languagePrefs?.discard();
            themePrefs?.discard();
            notifPrefs?.discard();
            studyPrefs?.discard();
            datetimePrefs?.discard();
        },
    });
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
