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
import { initLanguageSwitcherPrefs } from "./language-switcher-prefs.js";
import { initGeneralPrefs } from "./general-prefs.js";
import { initDateTimePrefs } from "./datetime-prefs.js";
import {
    initReleaseChangelogPrefs,
    shouldShowReleaseChangelog,
} from "./release-changelog-prefs.js";
import {
    applyTimeFormatToLocalStorage,
    applyTimezoneToLocalStorage,
} from "../../reuse/timestamp.js";
import { createUnsavedChangesBar } from "../../reuse/unsaved-changes.js";
import { initAdvancedPrefs } from "./advanced-prefs.js";
import {
    loadEditorAcknowledgement,
    saveEditorAcknowledgement,
} from "./editor-acknowledgement.js";
import { registerSearchIndex } from "../../reuse/search-util/popup.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { showToast } from "../../reuse/toast.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import {
    isValidMessageStyle,
    normalizeMessageStyle,
} from "../../reuse/message-style-options.js";
import { loadDynamicContributions } from "../../reuse/dynamic-contribution-loader.js";
import { renderStructuredContent } from "../../reuse/structured-content.js";
import {
    collectSettingsSearchGroups,
    renderAccountOperationButton,
} from "./search-index.js";
import {
    getSettingsShellOptions,
    resolveSettingsSetupRedirect,
} from "./setup-requirement.js";

async function loadPrefs() {
    const account = localStorage.getItem("cognis_account");
    if (!account) return null;
    const response = await apiFetch(
        `/api/v1/social/users/${encodeURIComponent(account)}/preferences/ui-preferences`,
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
        `/api/v1/social/users/${encodeURIComponent(account)}/preferences/ui-preferences`,
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

async function loadAuthSetupRequirement() {
    try {
        const response = await apiFetch("/api/v1/auth/setup-status");
        if (!response.ok) {
            return false;
        }
        const payload = await response.json().catch(() => null);
        return payload?.data?.requiresSetup === true;
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
    const editorAcknowledgementAccepted =
        await loadEditorAcknowledgement().catch(() => false);
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
    const authSetupRequired = await loadAuthSetupRequirement();
    const setupRedirect = resolveSettingsSetupRedirect(
        window.location.pathname,
        window.location.hash,
        authSetupRequired,
    );
    if (setupRedirect) {
        window.location.replace(setupRedirect);
        return;
    }
    applyDocumentTitle(i18n, "ui.page.title.settings");

    applyTimezoneToLocalStorage(
        loadedPrefs?.timezone ?? null,
        loadedPrefs?.detectedTimezone ?? null,
    );
    applyTimeFormatToLocalStorage(loadedPrefs?.timeFormat ?? "auto");
    const sectionDescriptors = await loadSettingsSections();
    let settingsSearchSections = [];

    let savedMode = getStoredTheme();

    let fontPrefs;
    let languagePrefs;
    let languageSwitcherPrefs;
    let themePrefs;
    let messageStylePrefs;
    let releaseNotesPrefs;
    let changesBar;
    let generalPrefs;
    let datetimePrefs;
    let advancedPrefs;
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
    const generalContributions = contributedSections.filter(
        (section) => section.targetSectionId === "general",
    );
    const standaloneContributions = contributedSections.filter(
        (section) => section.targetSectionId !== "general",
    );

    function renderContributedSection(section) {
        if (Array.isArray(section.content)) {
            return renderStructuredContent(section.content);
        }
        return section.renderContent?.() ?? "";
    }

    function renderContributedSections(sections) {
        return sections
            .map((section, sectionIndex) => {
                const divider =
                    sectionIndex === 0
                        ? ""
                        : '<hr class="structured-content__divider" />';
                return `${divider}${renderContributedSection(section)}`;
            })
            .join("");
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
            isDirty: () => currentMode !== savedMode,
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
            isDirty: () => currentMessageStyle !== savedMessageStyle,
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
            <div class="components-section">
              <h3 class="components-section-heading">${i18n.t("ui.app.settings.emails")}</h3>
              <div class="components-section-body">
                <ul id="email-list" class="email-list"></ul>
                <div class="email-add-row">
                  <input id="email-add-input" type="email" placeholder="${i18n.t("ui.app.settings.emails_add_placeholder")}" />
                  <button id="email-add-btn" class="btn-confirm btn-animated" type="button">${i18n.t("ui.app.settings.emails_add")}</button>
                </div>
              </div>
            </div>
            <div class="components-section">
              <h3 class="components-section-heading">
                ${escapeHtml(i18n.t("ui.app.settings.show_changelogs"))}
                ${renderInfoTooltip(i18n.t("ui.app.settings.show_changelogs_hint"), tooltipAria)}
              </h3>
              <div class="components-section-body">
                <label class="switch">
                  <input id="pref-release-changelog-show" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
            </div>
            ${renderContributedSections(generalContributions)}
            <section class="settings-danger-zone" aria-labelledby="settings-danger-zone-title">
              <h3 id="settings-danger-zone-title" class="components-section-heading">${escapeHtml(i18n.t("ui.app.settings.danger_zone"))}</h3>
              <p>${escapeHtml(i18n.t("ui.app.settings.danger_zone_body"))}</p>
              <div class="settings-danger-actions">
                ${renderAccountOperationButton(i18n, "archive", "ui.app.settings.danger_archive", "ui.app.settings.danger_archive_warning")}
                ${renderAccountOperationButton(i18n, "deactivate", "ui.app.settings.danger_deactivate", "ui.app.settings.danger_deactivate_warning")}
                ${renderAccountOperationButton(i18n, "delete", "ui.app.settings.danger_delete", "ui.app.settings.danger_delete_warning")}
              </div>
            </section>
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
                    for (const section of generalContributions) {
                        section.onRender();
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
            <div class="components-section">
            <h3 class="font-heading-row components-section-heading">
              ${i18n.t("ui.app.settings.font")}
              <button id="pref-font-reset" type="button" disabled>${i18n.t("ui.reuse.reset")}</button>
            </h3>
            <div class="components-section-body">
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
            </div>
            </div>
            <div class="theme-subsection components-section">
              <h3 class="components-section-heading">${i18n.t("ui.app.settings.theme")}</h3>
              <div class="theme-selector" id="pref-theme-selector">
                <button type="button" class="theme-btn" data-theme-value="dark">${i18n.t("ui.app.settings.theme_dark")}</button>
                <button type="button" class="theme-btn" data-theme-value="light">${i18n.t("ui.app.settings.theme_light")}</button>
              </div>
            </div>
            <div class="message-style-subsection components-section">
              <h3 class="components-section-heading">${i18n.t("ui.app.settings.message_style")}</h3>
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
                heading: i18n.t("ui.reuse.language"),
                elements: [
                    {
                        id: "language-preferences",
                        label: i18n.t("ui.reuse.language"),
                        render: () => `
            <div class="settings-language-block">
              <div class="settings-language-switcher-preference">
                <h3>${i18n.t("ui.app.settings.always_show_language_switcher")}</h3>
                <label class="switch">
                  <input id="pref-always-show-language-switcher" type="checkbox" />
                  <span class="slider"></span>
                </label>
              </div>
              <div class="settings-language-tables">
                <div>
                  <div class="settings-language-heading-row components-section-heading">
                    <h3>${i18n.t("ui.app.settings.available_languages")}</h3>
                  </div>
                  <table id="available-languages" class="language-table"></table>
                </div>
                <div>
                  <div class="settings-language-heading-row components-section-heading">
                    <h3>${i18n.t("ui.app.settings.preferred_languages")}</h3>
                    <button id="pref-language-sync-from-browser" type="button" class="btn-neutral btn-animated">${i18n.t("ui.app.settings.sync_from_browser")}</button>
                  </div>
                  <table id="preferred-languages" class="language-table"></table>
                </div>
              </div>
            </div>
          `,
                    },
                ],
                onRender: () => {
                    if (!languageSwitcherPrefs) {
                        languageSwitcherPrefs = initLanguageSwitcherPrefs(
                            root,
                            {
                                existingPrefs: loadedPrefs,
                                onDirtyChange: (dirty) =>
                                    markDirty("language-switcher", dirty),
                                onValueChange: (visible) =>
                                    window.dispatchEvent(
                                        new CustomEvent(
                                            "cognis:language-switcher-visibility",
                                            { detail: { visible } },
                                        ),
                                    ),
                            },
                        );
                    }
                    languageSwitcherPrefs.bind();
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
        ...standaloneContributions.map((section) => ({
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
                        render: () => renderContributedSection(section),
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
            <section class="components-section">
              <h3 class="components-section-heading">${i18n.t("ui.app.settings.datetime_tz_heading")}</h3>
              <div class="components-section-body">
                <label class="timezone-label">
                  ${i18n.t("ui.app.settings.datetime_tz_label")}
                  <select id="pref-timezone-select" class="theme-select"></select>
                </label>
              </div>
            </section>
            <section class="components-section">
              <h3 class="components-section-heading">${i18n.t("ui.app.settings.datetime_time_format_heading")}</h3>
              <div class="components-section-body">
                <label class="timezone-label">
                  ${i18n.t("ui.app.settings.datetime_time_format_label")}
                  <select id="pref-time-format-select" class="theme-select"></select>
                </label>
              </div>
            </section>
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
            <h3 class="components-section-heading">${i18n.t("ui.app.settings.preferences")}</h3>
            <textarea id="prefs-dump" class="prefs-dump" aria-label="${escapeHtml(i18n.t("ui.app.settings.preferences"))}" spellcheck="false" readonly>${i18n.t("ui.app.settings.prefs_loading")}</textarea>
          `,
                    },
                ],
                onRender: () => {
                    const prefsDumpEl = root.querySelector("#prefs-dump");
                    if (prefsDumpEl) {
                        prefsDumpEl.value = JSON.stringify(
                            loadedPrefs ?? {},
                            null,
                            2,
                        );
                        advancedPrefs = initAdvancedPrefs(root, {
                            existingPrefs: loadedPrefs ?? {},
                            acknowledgementAccepted:
                                editorAcknowledgementAccepted,
                            saveAcknowledgement: saveEditorAcknowledgement,
                            i18n,
                            onDirtyChange: (dirty) =>
                                markDirty("advanced", dirty),
                        });
                    }
                },
            },
        },
    ];

    const shellOptions = getSettingsShellOptions();

    settingsSearchSections = elements;
    registerSearchIndex(
        "settings-index",
        () => collectSettingsSearchGroups(settingsSearchSections, loadedPrefs),
        { stageId: "settings-index" },
    );

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
        ...shellOptions,
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
        ${standaloneContributions
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

    root.querySelector('[data-composer-scroll="advanced"]')?.addEventListener(
        "click",
        () => {
            setTimeout(() => advancedPrefs?.requestEditingConsent(), 0);
        },
    );

    const floatingSlot = composer.getFloatingSlot("settings-changes-bar");

    changesBar = createUnsavedChangesBar(floatingSlot, {
        onSave: async () => {
            const mode = themePrefs?.getMode() ?? savedMode;
            for (const section of contributedSections) {
                if (section.isDirty()) {
                    await section.save();
                }
            }
            let prefs;
            try {
                prefs = advancedPrefs?.isDirty()
                    ? advancedPrefs.getPreferences()
                    : { ...(loadedPrefs ?? {}) };
            } catch {
                showToast(i18n.t("ui.app.settings.preferences_invalid_json"), {
                    variant: "error",
                });
                throw new Error("invalid_preferences_json");
            }
            const selectedPrefs = {
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
                timeFormat:
                    datetimePrefs?.getTimeFormat() ??
                    loadedPrefs?.timeFormat ??
                    "auto",
                messageStyle:
                    messageStylePrefs?.getMessageStyle() ??
                    normalizeMessageStyle(loadedPrefs?.messageStyle),
                releaseChangelogShow:
                    releaseNotesPrefs?.getShowReleaseChangelogs() ??
                    shouldShowReleaseChangelog(loadedPrefs),
                alwaysShowLanguageSwitcher:
                    languageSwitcherPrefs?.getValue() ??
                    loadedPrefs?.alwaysShowLanguageSwitcher ??
                    true,
            };
            if (!advancedPrefs?.isDirty()) {
                prefs = { ...prefs, ...selectedPrefs };
            } else {
                if (fontPrefs?.isDirty()) {
                    prefs.appFont = selectedPrefs.appFont;
                    prefs.appFontSize = selectedPrefs.appFontSize;
                }
                if (languagePrefs?.isDirty()) {
                    prefs.languagePriority = selectedPrefs.languagePriority;
                    prefs.languagePriorityMode =
                        selectedPrefs.languagePriorityMode;
                }
                if (themePrefs?.isDirty()) {
                    prefs.mode = selectedPrefs.mode;
                }
                if (datetimePrefs?.isDirty()) {
                    prefs.timezone = selectedPrefs.timezone;
                    prefs.timeFormat = selectedPrefs.timeFormat;
                }
                if (messageStylePrefs?.isDirty()) {
                    prefs.messageStyle = selectedPrefs.messageStyle;
                }
                if (releaseNotesPrefs?.isDirty()) {
                    prefs.releaseChangelogShow =
                        selectedPrefs.releaseChangelogShow;
                }
                if (languageSwitcherPrefs?.isDirty()) {
                    prefs.alwaysShowLanguageSwitcher =
                        selectedPrefs.alwaysShowLanguageSwitcher;
                }
            }
            await savePrefs(prefs);
            loadedPrefs = prefs;
            const appliedMode = prefs.mode ?? mode;
            persistTheme(appliedMode);
            applyTheme(appliedMode);
            setPreferredLanguages(prefs.languagePriority, {
                mode: prefs.languagePriorityMode,
            });
            applyTimezoneToLocalStorage(prefs.timezone ?? null, null);
            applyTimeFormatToLocalStorage(prefs.timeFormat ?? "auto");
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
            languageSwitcherPrefs?.commit();
            advancedPrefs?.commit(prefs);
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
            languageSwitcherPrefs?.discard();
            themePrefs?.discard();
            messageStylePrefs?.discard();
            releaseNotesPrefs?.discard();
            datetimePrefs?.discard();
            advancedPrefs?.discard();
            for (const section of contributedSections) {
                section.discard();
            }
        },
    });
    for (const [key, dirty] of pendingDirtyStates.entries()) {
        changesBar.markDirty(key, dirty);
    }
}

await mountWhenDirect(mount);
