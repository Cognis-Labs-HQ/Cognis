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
import { createUnsavedChangesBar } from "../../reuse/unsaved-changes.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { openPopup } from "../../reuse/popup.js";

const root = document.querySelector("#app");
let languagePriority = readPreferredLanguages();
const i18n = await createI18n({ preferredLanguages: languagePriority });
applyDocumentTitle(i18n, "ui.page.title.settings");

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

const existingPrefs = await loadPrefs().catch(() => null);
if (Array.isArray(existingPrefs?.languagePriority))
    languagePriority = existingPrefs.languagePriority;

const savedMode = getStoredTheme();

let fontPrefs;
let languagePrefs;
let themePrefs;
let changesBar;
let generalPrefs;
let notifPrefs;

function initThemePrefs({ onDirtyChange }) {
    let currentMode = savedMode;

    function updateSelector() {
        root.querySelectorAll(".theme-btn[data-theme-value]").forEach((btn) => {
            btn.classList.toggle(
                "active",
                btn.dataset.themeValue === currentMode,
            );
        });
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
            <div id="email-status" class="notif-status-message" aria-live="polite"></div>
          `,
                },
            ],
            onRender: () => {
                const account = localStorage.getItem("cognis_account") ?? "";
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
              <h3>${i18n.t("ui.app.settings.font_heading")}</h3>
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
                    existingPrefs,
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
                    languagePrefs = initLanguagePrefs(root, languagePriority, {
                        onDirtyChange: (dirty) =>
                            changesBar?.markDirty("language", dirty),
                    });
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
                const account = localStorage.getItem("cognis_account") ?? "";
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
                        existingPrefs != null
                            ? JSON.stringify(existingPrefs, null, 2)
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
        const selectedFont = fontPrefs?.getFont();
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
        const prefs = {
            appFont: selectedFont ? toFontFamilyValue(selectedFont) : undefined,
            appFontSize: fontPrefs?.getFontSize(),
            languagePriority: languagePrefs?.getPriority() ?? languagePriority,
            mode,
        };
        await savePrefs(prefs);
        persistTheme(mode);
        applyTheme(mode);
        setPreferredLanguages(prefs.languagePriority);
        localStorage.setItem("cognis_ui_preferences", JSON.stringify(prefs));
        await openPopup({
            title: i18n.t("ui.app.settings.saved_alert"),
            variant: "info",
            actions: [
                {
                    id: "close",
                    label: i18n.t("ui.reuse.generic.done"),
                    variant: "confirm",
                },
            ],
        });
        window.location.reload();
    },
    onDiscard: () => {
        fontPrefs?.discard();
        languagePrefs?.discard();
        themePrefs?.discard();
        notifPrefs?.discard();
    },
});
