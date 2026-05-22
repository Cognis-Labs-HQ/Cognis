import { applyUiPreferences } from "../../reuse/ui-preferences.js";
import { apiFetch } from "../../reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    extendI18n,
    readLanguagePriorityMode,
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
import { initDateTimePrefs } from "./datetime-prefs.js";
import {
    initReleaseChangelogPrefs,
    shouldShowReleaseChangelog,
} from "./release-changelog-prefs.js";
import { applyTimezoneToLocalStorage } from "../../reuse/timestamp.js";
import { createUnsavedChangesBar } from "../../reuse/unsaved-changes.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { showToast } from "../../reuse/toast.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import {
    isValidMessageStyle,
    normalizeMessageStyle,
} from "../../reuse/message-style-options.js";
import { loadDynamicContributions } from "../../reuse/dynamic-contribution-loader.js";

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

async function loadSettingsSections() {
    try {
        const res = await apiFetch("/api/v1/ui/settings-sections");
        if (!res.ok) return [];
        const payload = await res.json();
        return payload.data ?? [];
    } catch {
        return [];
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

/**
 * Resolves the language priority mode to persist when the user saves settings.
 * If the language prefs have pending unsaved changes, the pending mode is used
 * (so "sync from browser" correctly resets to "auto"). Otherwise the previously
 * stored/loaded mode is preserved.
 *
 * @param {ReturnType<import('./language-prefs.js').initLanguagePrefs> | undefined} languagePrefsController
 * @param {{ languagePriorityMode?: string } | null} existingPrefs
 * @param {string} storedMode
 * @returns {string}
 */
function resolveLanguagePriorityMode(
    languagePrefsController,
    existingPrefs,
    storedMode,
) {
    if (languagePrefsController?.isDirty()) {
        return languagePrefsController.getPendingMode() ?? "manual";
    }
    if (existingPrefs?.languagePriorityMode === "manual") return "manual";
    return storedMode;
}

const LANGUAGE_RELOAD_DELAY_MS = 400;
const DIRTY_KEY_MESSAGE_STYLE = "message-style";

export async function mount(root, { signal } = {}) {
    let loadedPrefs = await loadPrefs().catch(() => null);
    const storedLanguagePriorityMode = readLanguagePriorityMode();
    const initialLanguagePriorityMode =
        loadedPrefs?.languagePriorityMode === "manual"
            ? "manual"
            : storedLanguagePriorityMode;
    if (
        initialLanguagePriorityMode === "manual" &&
        Array.isArray(loadedPrefs?.languagePriority)
    ) {
        setPreferredLanguages(loadedPrefs.languagePriority, {
            mode: initialLanguagePriorityMode,
        });
    }
    let languagePriority = Array.isArray(loadedPrefs?.languagePriority)
        ? loadedPrefs.languagePriority
        : readPreferredLanguages();
    const i18n = await createI18n({ preferredLanguages: languagePriority });
    applyDocumentTitle(i18n, "ui.page.title.settings");

    applyTimezoneToLocalStorage(
        loadedPrefs?.timezone ?? null,
        loadedPrefs?.detectedTimezone ?? null,
    );
    const sectionDescriptors = await loadSettingsSections();

    let savedMode = getStoredTheme();

    let fontPrefs;
    let languagePrefs;
    let themePrefs;
    let messageStylePrefs;
    let releaseNotesPrefs;
    let changesBar;
    let generalPrefs;
    let datetimePrefs;
    const pendingDirtyStates = new Map();

    function markDirty(key, dirty) {
        pendingDirtyStates.set(key, dirty);
        changesBar?.markDirty(key, dirty);
    }

    let contributedSections = [];
    try {
        contributedSections = await loadDynamicContributions(
            sectionDescriptors,
            {
                exportName: "createSettingsSection",
                buildArgs: async (descriptor) => ({
                    i18n: await extendI18n(i18n, descriptor.stringsBaseUrl),
                    root,
                    markDirty,
                }),
                onError: (error, descriptor) => {
                    console.warn(
                        `[settings] Failed loading ${descriptor?.scriptUrl}:`,
                        error,
                    );
                },
            },
        );
    } catch (error) {
        console.warn(`[settings] sections-load-failed:`, error);
        contributedSections = [];
    }

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

    function initMessageStylePrefs({ onDirtyChange }) {
        let savedMessageStyle = normalizeMessageStyle(
            loadedPrefs?.messageStyle,
        );
        let currentMessageStyle = savedMessageStyle;

        function updateSelector() {
            root.querySelectorAll(".message-style-btn").forEach((button) => {
                button.classList.toggle(
                    "active",
                    button.dataset.messageStyleValue === currentMessageStyle,
                );
            });
        }

        root.querySelectorAll(".message-style-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const nextStyle = button.dataset.messageStyleValue;
                if (!isValidMessageStyle(nextStyle)) return;
                currentMessageStyle = nextStyle;
                updateSelector();
                onDirtyChange?.(currentMessageStyle !== savedMessageStyle);
            });
        });

        updateSelector();

        return {
            getMessageStyle: () => currentMessageStyle,
            commit: () => {
                savedMessageStyle = currentMessageStyle;
            },
            discard: () => {
                currentMessageStyle = savedMessageStyle;
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
                        render: () => {
                            const tooltipAria = i18n.t(
                                "ui.reuse.more_information",
                            );
                            return `
            <h3>${i18n.t("ui.app.settings.emails")}</h3>
            <ul id="email-list" class="email-list"></ul>
            <div class="email-add-row">
              <input id="email-add-input" type="email" placeholder="${i18n.t("ui.app.settings.emails_add_placeholder")}" />
              <button id="email-add-btn" class="btn-confirm btn-animated" type="button">${i18n.t("ui.app.settings.emails_add")}</button>
            </div>
            <div class="font-heading-row">
              <h3>${escapeHtml(i18n.t("ui.app.settings.show_changelogs"))}</h3>
              ${renderInfoTooltip(i18n.t("ui.app.settings.show_changelogs_hint"), tooltipAria)}
            </div>
            <div>
              <label class="switch">
                <input id="pref-release-changelog-show" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
          `;
                        },
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
                    if (!releaseNotesPrefs) {
                        releaseNotesPrefs = initReleaseChangelogPrefs(root, {
                            existingPrefs: loadedPrefs,
                            onDirtyChange: (dirty) =>
                                markDirty("release-notes", dirty),
                        });
                    } else {
                        releaseNotesPrefs.refresh();
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
              <button id="pref-font-reset" type="button" disabled>${i18n.t("ui.reuse.reset")}</button>
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
            <div class="message-style-subsection">
              <h3>${i18n.t("ui.app.settings.message_style")}</h3>
              <div class="message-style-selector" id="pref-message-style-selector">
                <button type="button" class="message-style-btn" data-message-style-value="default">${i18n.t("ui.app.settings.message_style_default")}</button>
                <button type="button" class="message-style-btn" data-message-style-value="speech_bubbles">${i18n.t("ui.app.settings.message_style_speech_bubbles")}</button>
                <button type="button" class="message-style-btn" data-message-style-value="irc">${i18n.t("ui.app.settings.message_style_irc")}</button>
              </div>
            </div>
          `,
                    },
                ],
                onRender: () => {
                    fontPrefs = initFontPrefs(root, {
                        existingPrefs: loadedPrefs,
                        i18n,
                        onDirtyChange: (dirty) => markDirty("font", dirty),
                    });
                    fontPrefs.init();
                    themePrefs = initThemePrefs({
                        onDirtyChange: (dirty) => markDirty("theme", dirty),
                    });
                    messageStylePrefs = initMessageStylePrefs({
                        onDirtyChange: (dirty) =>
                            markDirty(DIRTY_KEY_MESSAGE_STYLE, dirty),
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
            <div class="settings-language-heading-row">
              <h3>${i18n.t("ui.app.settings.available_languages")}</h3>
            </div>
            <table id="available-languages" class="language-table"></table>
          `,
                    },
                    {
                        id: "preferred-languages",
                        label: i18n.t("ui.app.settings.preferred_languages"),
                        render: () => `
            <div class="settings-language-heading-row">
              <h3>${i18n.t("ui.app.settings.preferred_languages")}</h3>
              <button id="pref-language-sync-from-browser" type="button" class="btn-animated">${i18n.t("ui.app.settings.sync_from_browser")}</button>
            </div>
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
                                    markDirty("language", dirty),
                            },
                        );
                        languagePrefs.init();
                    } else {
                        languagePrefs.renderTables();
                    }
                    const syncButton = root.querySelector(
                        "#pref-language-sync-from-browser",
                    );
                    if (syncButton) {
                        syncButton.onclick = () =>
                            languagePrefs?.syncFromBrowser();
                    }
                },
            },
        },
        ...contributedSections.map((section) => ({
            id: section.id,
            label: section.label,
            subComposerOptions: {
                allowCustomization: false,
                preferenceKey: section.preferenceKey,
                heading: section.heading,
                elements: [
                    {
                        id: `${section.id}-content`,
                        label: section.label,
                        render: () => section.renderContent(),
                    },
                ],
                onRender: () => section.onRender(),
            },
        })),
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
                        onDirtyChange: (dirty) => markDirty("datetime", dirty),
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
            title: i18n.t("ui.reuse.settings"),
            subtitle: i18n.t("ui.app.settings.page_subtitle"),
        },
        pageOverrides: {
            appearance: { showThemeToggle: false },
        },
        toolbar: [
            {
                id: "settings-nav",
                label: i18n.t("ui.reuse.settings"),
                render: () => `
      <h2>${i18n.t("ui.reuse.settings")}</h2>
      <ul>
        <li><button data-composer-scroll="general">${i18n.t("ui.app.settings.general")}</button></li>
        <li><button data-composer-scroll="appearance">${i18n.t("ui.reuse.appearance")}</button></li>
        <li><button data-composer-scroll="language">${i18n.t("ui.reuse.language")}</button></li>
        ${contributedSections
            .map(
                (section) =>
                    `<li><button data-composer-scroll="${escapeHtml(section.id)}">${section.label}</button></li>`,
            )
            .join(" ")}
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
      <button class="btn-cancel btn-animated" type="button" data-action="discard">${i18n.t("ui.reuse.discard")}</button>
      <button class="btn-confirm btn-animated" type="button" data-action="save">${i18n.t("ui.reuse.save")}</button>
    `,
            },
        ],
    });
    await composer.init();

    const floatingSlot = composer.getFloatingSlot("settings-changes-bar");

    changesBar = createUnsavedChangesBar(floatingSlot, {
        onSave: async () => {
            const mode = themePrefs?.getMode() ?? savedMode;
            for (const section of contributedSections) {
                if (section.isDirty()) {
                    await section.save();
                }
            }
            const prefs = {
                appFont: fontPrefs
                    ? toFontFamilyValue(fontPrefs.getFont())
                    : loadedPrefs?.appFont,
                appFontSize:
                    fontPrefs?.getFontSize() ?? loadedPrefs?.appFontSize,
                languagePriority:
                    languagePrefs?.getPriority() ?? languagePriority,
                languagePriorityMode: resolveLanguagePriorityMode(
                    languagePrefs,
                    loadedPrefs,
                    storedLanguagePriorityMode,
                ),
                mode,
                timezone:
                    datetimePrefs?.getTimezone() ??
                    loadedPrefs?.timezone ??
                    "auto",
                messageStyle:
                    messageStylePrefs?.getMessageStyle() ??
                    normalizeMessageStyle(loadedPrefs?.messageStyle),
                releaseChangelogShow:
                    releaseNotesPrefs?.getShowReleaseChangelogs() ??
                    shouldShowReleaseChangelog(loadedPrefs),
                releaseChangelogSeenSlugs:
                    loadedPrefs?.releaseChangelogSeenSlugs ?? [],
                releaseChangelogLastVersion:
                    loadedPrefs?.releaseChangelogLastVersion ?? null,
            };
            await savePrefs(prefs);
            loadedPrefs = { ...loadedPrefs, ...prefs };
            persistTheme(mode);
            applyTheme(mode);
            setPreferredLanguages(prefs.languagePriority, {
                mode: prefs.languagePriorityMode,
            });
            applyTimezoneToLocalStorage(prefs.timezone ?? null, null);
            localStorage.setItem(
                "cognis_ui_preferences",
                JSON.stringify(prefs),
            );
            applyUiPreferences(prefs); // apply font/theme/timezone to live page without reload
            fontPrefs?.commit();
            themePrefs?.commit();
            messageStylePrefs?.commit();
            releaseNotesPrefs?.commit();
            datetimePrefs?.commit();
            languagePrefs?.commit();
            for (const section of contributedSections) {
                section.commit();
            }
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
            messageStylePrefs?.discard();
            releaseNotesPrefs?.discard();
            datetimePrefs?.discard();
            for (const section of contributedSections) {
                section.discard();
            }
        },
    });
    for (const [key, dirty] of pendingDirtyStates.entries()) {
        changesBar.markDirty(key, dirty);
    }
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
