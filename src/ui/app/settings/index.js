import {
    hasLanguagePriorityChanged,
    resolveLanguagePriorityMode,
} from "./language-priority.js";
import { bindCapability } from "../../reuse/capabilities.js";

import { guides } from "./guides.js";
import { navigateTo } from "../../reuse/app-router.js";
import { createLanguageRedraw } from "./language-redraw.js";
import { uiLanguageMembershipChanged } from "../../reuse/ui-language-state.js";
import { bindOnlineSettingsControls } from "./online-controls.js";
import {
    applyUiPreferences,
    loadUiPreferences as loadPreferences,
    saveUiPreferences as savePreferences,
} from "../../reuse/ui-preferences.js";
import { isOffline } from "../../reuse/offline-state.js";
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
    initializeFontPreferences,
    DEFAULT_FONT_SIZE,
} from "../../reuse/font-prefs.js";
import { initializeLanguagePreferences } from "./language-prefs.js";
import { initializeCheckboxPreferences } from "./checkbox-prefs.js";
import { initializeGeneralPreferences } from "./general-prefs.js";
import { initializeDateTimePreferences } from "./datetime-prefs.js";
import {
    initializeReleaseChangelogPreferences,
    shouldShowReleaseChangelog,
} from "./release-changelog-prefs.js";
import {
    applyTimeFormatToLocalStorage,
    applyTimezoneToLocalStorage,
} from "../../reuse/timestamp.js";
import { createUnsavedChangesBar } from "../../reuse/unsaved-changes.js";
import { initializeAdvancedPreferences } from "./advanced-prefs.js";
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

const log = bindCapability("ui:log");

async function loadSettingsSections() {
    if (isOffline()) return [];
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
    if (isOffline()) return false;
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

const DIRTY_KEY_MESSAGE_STYLE = "message-style";

export async function mount(root, { signal } = {}) {
    let [loadedPreferences, editorAcknowledgementAccepted, authSetupRequired] =
        await Promise.all([
            loadPreferences().catch(() => null),
            loadEditorAcknowledgement().catch(() => false),
            loadAuthSetupRequirement(),
        ]);
    if (signal?.aborted) return;
    const storedLanguagePriorityMode = readLanguagePriorityMode();
    const initialLanguagePriorityMode =
        loadedPreferences?.languagePriorityMode === "manual"
            ? "manual"
            : storedLanguagePriorityMode;
    if (
        initialLanguagePriorityMode === "manual" &&
        Array.isArray(loadedPreferences?.languagePriority)
    ) {
        setPreferredLanguages(loadedPreferences.languagePriority, {
            mode: initialLanguagePriorityMode,
        });
    }
    let languagePriority = Array.isArray(loadedPreferences?.languagePriority)
        ? loadedPreferences.languagePriority
        : readPreferredLanguages();
    const setupRedirect = resolveSettingsSetupRedirect(
        window.location.pathname,
        window.location.hash,
        authSetupRequired,
    );
    if (setupRedirect) {
        await navigateTo(setupRedirect, { replace: true });
        return;
    }
    const [i18n, sectionDescriptors] = await Promise.all([
        createI18n({ preferredLanguages: languagePriority }),
        loadSettingsSections(),
    ]);
    if (signal?.aborted) return;
    applyDocumentTitle(i18n, "ui.page.title.settings");
    const scheduleLanguageRedraw = createLanguageRedraw({ i18n, signal });
    const refreshOnlineControls = bindOnlineSettingsControls(root, signal);
    const reportGeneralFailure = (error) => {
        if (signal?.aborted) return;
        void log("error", i18n.t("ui.app.settings.emails_add_failed"), {
            operation: "loadEmailSettings",
            errorName: error.name,
        });
        showToast(i18n.t("ui.app.settings.emails_add_failed"), {
            variant: "error",
        });
    };

    applyTimezoneToLocalStorage(
        loadedPreferences?.timezone ?? null,
        loadedPreferences?.detectedTimezone ?? null,
    );
    applyTimeFormatToLocalStorage(loadedPreferences?.timeFormat ?? "auto");
    let settingsSearchSections = [];

    let savedMode = getStoredTheme();

    let fontPreferences;
    let languagePreferences;
    let languageSwitcherPreferences;
    let themePreferences;
    let messageStylePreferences;
    let releaseNotesPreferences;
    let offlinePreferences;
    let changesBar;
    let generalPreferences;
    let datetimePreferences;
    let advancedPreferences;
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
                    signal,
                }),
                onError: (error, descriptor) => {
                    void log(
                        "warn",
                        `[settings] Failed loading ${descriptor?.scriptUrl}:`,
                        error,
                    );
                },
            },
        );
    } catch (error) {
        void log("warn", `[settings] sections-load-failed:`, error);
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

    function initializeThemePreferences({ onDirtyChange }) {
        let currentMode = savedMode;

        function updateSelector() {
            root.querySelectorAll(".theme-btn[data-theme-value]").forEach(
                (button) => {
                    button.classList.toggle(
                        "active",
                        button.dataset.themeValue === currentMode,
                    );
                },
            );
        }

        root.querySelectorAll(".theme-btn[data-theme-value]").forEach(
            (button) => {
                button.addEventListener("click", () => {
                    currentMode = button.dataset.themeValue;
                    updateSelector();
                    onDirtyChange?.(currentMode !== savedMode);
                });
            },
        );

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

    function initializeMessageStylePreferences({ onDirtyChange }) {
        let savedMessageStyle = normalizeMessageStyle(
            loadedPreferences?.messageStyle,
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
            <div class="components-section">
              <h3 class="components-section-heading">
                ${escapeHtml(i18n.t("ui.app.settings.offline_enabled"))}
                ${renderInfoTooltip(i18n.t("ui.app.settings.offline_enabled_hint"), tooltipAria)}
              </h3>
              <div class="components-section-body">
                <label class="switch">
                  <input id="pref-offline-enabled" type="checkbox" aria-label="${escapeHtml(i18n.t("ui.app.settings.offline_enabled"))}" />
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
                    refreshOnlineControls();
                    if (!generalPreferences) {
                        generalPreferences = initializeGeneralPreferences(
                            root,
                            {
                                i18n,
                                username: account,
                                onRender: refreshOnlineControls,
                                signal,
                            },
                        );
                        void generalPreferences
                            .init()
                            .catch(reportGeneralFailure);
                    } else {
                        void generalPreferences
                            .refresh()
                            .catch(reportGeneralFailure);
                    }
                    if (!releaseNotesPreferences) {
                        releaseNotesPreferences =
                            initializeReleaseChangelogPreferences(root, {
                                existingPrefs: loadedPreferences,
                                onDirtyChange: (dirty) =>
                                    markDirty("release-notes", dirty),
                            });
                    } else {
                        releaseNotesPreferences.refresh();
                    }
                    if (!offlinePreferences) {
                        offlinePreferences = initializeCheckboxPreferences(
                            root,
                            {
                                existingPrefs: loadedPreferences,
                                preference: "offlineEnabled",
                                selector: "#pref-offline-enabled",
                                onDirtyChange: (dirty) =>
                                    markDirty("offline", dirty),
                            },
                        );
                    }
                    offlinePreferences.bind();
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
                    fontPreferences = initializeFontPreferences(root, {
                        existingPrefs: loadedPreferences,
                        i18n,
                        onDirtyChange: (dirty) => markDirty("font", dirty),
                    });
                    fontPreferences.init();
                    themePreferences = initializeThemePreferences({
                        onDirtyChange: (dirty) => markDirty("theme", dirty),
                    });
                    messageStylePreferences = initializeMessageStylePreferences(
                        {
                            onDirtyChange: (dirty) =>
                                markDirty(DIRTY_KEY_MESSAGE_STYLE, dirty),
                        },
                    );
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
                  <input id="pref-always-show-language-switcher" data-ui-language-online type="checkbox" />
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
                    <button id="pref-language-sync-from-browser" data-ui-language-online type="button" class="btn-neutral btn-animated">${i18n.t("ui.app.settings.sync_from_browser")}</button>
                  </div>
                  <table id="preferred-languages" class="language-table"></table>
                </div>
              </div>
            </div>
          `,
                    },
                ],
                onRender: () => {
                    if (!languageSwitcherPreferences) {
                        languageSwitcherPreferences =
                            initializeCheckboxPreferences(root, {
                                existingPrefs: loadedPreferences,
                                onDirtyChange: (dirty) =>
                                    markDirty("language-switcher", dirty),
                                onCommit: (visible) =>
                                    window.dispatchEvent(
                                        new CustomEvent(
                                            "cognis:language-switcher-visibility",
                                            { detail: { visible } },
                                        ),
                                    ),
                            });
                    }
                    languageSwitcherPreferences.bind();
                    refreshOnlineControls();
                    if (!languagePreferences) {
                        languagePreferences = initializeLanguagePreferences(
                            root,
                            languagePriority,
                            {
                                signal,
                                onDirtyChange: (dirty) =>
                                    markDirty("language", dirty),
                            },
                        );
                        languagePreferences.init();
                    } else {
                        languagePreferences.renderTables();
                    }
                    const syncButton = root.querySelector(
                        "#pref-language-sync-from-browser",
                    );
                    if (syncButton) {
                        syncButton.onclick = () =>
                            languagePreferences?.syncFromBrowser();
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
                    datetimePreferences = initializeDateTimePreferences(root, {
                        existingPrefs: loadedPreferences,
                        i18n,
                        onDirtyChange: (dirty) => markDirty("datetime", dirty),
                    });
                    datetimePreferences.init();
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
                    const preferencesDumpElement =
                        root.querySelector("#prefs-dump");
                    if (preferencesDumpElement) {
                        preferencesDumpElement.value = JSON.stringify(
                            loadedPreferences ?? {},
                            null,
                            2,
                        );
                        advancedPreferences = initializeAdvancedPreferences(
                            root,
                            {
                                existingPrefs: loadedPreferences ?? {},
                                acknowledgementAccepted:
                                    editorAcknowledgementAccepted,
                                saveAcknowledgement: saveEditorAcknowledgement,
                                i18n,
                                onDirtyChange: (dirty) =>
                                    markDirty("advanced", dirty),
                            },
                        );
                    }
                },
            },
        },
    ];

    const shellOptions = getSettingsShellOptions();

    settingsSearchSections = elements;
    registerSearchIndex(
        "settings-index",
        () =>
            collectSettingsSearchGroups(
                settingsSearchSections,
                loadedPreferences,
            ),
        { stageId: "settings-index" },
    );

    const composer = createPageComposer(root, {
        tutorials: guides,
        signal,
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
    if (signal?.aborted) return;

    root.querySelector('[data-composer-scroll="advanced"]')?.addEventListener(
        "click",
        () => {
            setTimeout(() => advancedPreferences?.requestEditingConsent(), 0);
        },
    );

    const floatingSlot = composer.getFloatingSlot("settings-changes-bar");

    changesBar = createUnsavedChangesBar(floatingSlot, {
        onSave: async () => {
            const mode = themePreferences?.getMode() ?? savedMode;
            for (const section of contributedSections) {
                if (section.isDirty()) {
                    await section.save();
                }
            }
            let preferences;
            try {
                preferences = advancedPreferences?.isDirty()
                    ? advancedPreferences.getPreferences()
                    : { ...(loadedPreferences ?? {}) };
            } catch {
                showToast(i18n.t("ui.app.settings.preferences_invalid_json"), {
                    variant: "error",
                });
                throw new Error("invalid_preferences_json");
            }
            const selectedPreferences = {
                appFont: fontPreferences
                    ? toFontFamilyValue(fontPreferences.getFont())
                    : loadedPreferences?.appFont,
                appFontSize:
                    fontPreferences?.getFontSize() ??
                    loadedPreferences?.appFontSize,
                languagePriority:
                    languagePreferences?.getPriority() ?? languagePriority,
                languagePriorityMode: resolveLanguagePriorityMode(
                    languagePreferences,
                    loadedPreferences,
                    storedLanguagePriorityMode,
                ),
                mode,
                timezone:
                    datetimePreferences?.getTimezone() ??
                    loadedPreferences?.timezone ??
                    "auto",
                timeFormat:
                    datetimePreferences?.getTimeFormat() ??
                    loadedPreferences?.timeFormat ??
                    "auto",
                messageStyle:
                    messageStylePreferences?.getMessageStyle() ??
                    normalizeMessageStyle(loadedPreferences?.messageStyle),
                offlineEnabled:
                    offlinePreferences?.getValue() ??
                    loadedPreferences?.offlineEnabled ??
                    true,
                releaseChangelogShow:
                    releaseNotesPreferences?.getShowReleaseChangelogs() ??
                    shouldShowReleaseChangelog(loadedPreferences),
                alwaysShowLanguageSwitcher:
                    languageSwitcherPreferences?.getValue() ??
                    loadedPreferences?.alwaysShowLanguageSwitcher ??
                    true,
            };
            if (!advancedPreferences?.isDirty()) {
                preferences = { ...preferences, ...selectedPreferences };
            } else {
                if (fontPreferences?.isDirty()) {
                    preferences.appFont = selectedPreferences.appFont;
                    preferences.appFontSize = selectedPreferences.appFontSize;
                }
                if (languagePreferences?.isDirty()) {
                    preferences.languagePriority =
                        selectedPreferences.languagePriority;
                    preferences.languagePriorityMode =
                        selectedPreferences.languagePriorityMode;
                }
                if (themePreferences?.isDirty()) {
                    preferences.mode = selectedPreferences.mode;
                }
                if (datetimePreferences?.isDirty()) {
                    preferences.timezone = selectedPreferences.timezone;
                    preferences.timeFormat = selectedPreferences.timeFormat;
                }
                if (messageStylePreferences?.isDirty()) {
                    preferences.messageStyle = selectedPreferences.messageStyle;
                }
                if (offlinePreferences?.isDirty())
                    preferences.offlineEnabled =
                        selectedPreferences.offlineEnabled;
                if (releaseNotesPreferences?.isDirty()) {
                    preferences.releaseChangelogShow =
                        selectedPreferences.releaseChangelogShow;
                }
                if (languageSwitcherPreferences?.isDirty()) {
                    preferences.alwaysShowLanguageSwitcher =
                        selectedPreferences.alwaysShowLanguageSwitcher;
                }
            }
            if (
                isOffline() &&
                uiLanguageMembershipChanged(
                    { ...loadedPreferences, languagePriority },
                    preferences,
                )
            ) {
                showToast(i18n.t("ui.app.settings.language_offline_locked"), {
                    variant: "warning",
                });
                throw new Error("offline_language_settings_readonly");
            }
            await savePreferences(preferences);
            loadedPreferences = preferences;
            const appliedMode = preferences.mode ?? mode;
            persistTheme(appliedMode);
            applyTheme(appliedMode);
            setPreferredLanguages(preferences.languagePriority, {
                mode: preferences.languagePriorityMode,
            });
            applyTimezoneToLocalStorage(preferences.timezone ?? null, null);
            applyTimeFormatToLocalStorage(preferences.timeFormat ?? "auto");
            localStorage.setItem(
                "cognis_ui_preferences",
                JSON.stringify(preferences),
            );
            applyUiPreferences(preferences);
            if (
                hasLanguagePriorityChanged(
                    languagePriority,
                    preferences.languagePriority ?? [],
                )
            )
                window.dispatchEvent(
                    new CustomEvent("cognis:ui-language-settings-changed"),
                );
            fontPreferences?.commit();
            themePreferences?.commit();
            messageStylePreferences?.commit();
            offlinePreferences?.commit();
            releaseNotesPreferences?.commit();
            datetimePreferences?.commit();
            languagePreferences?.commit();
            languageSwitcherPreferences?.commit();
            advancedPreferences?.commit(preferences);
            for (const section of contributedSections) {
                section.commit();
            }
            showToast(i18n.t("ui.app.settings.saved_alert"), {
                variant: "success",
            });
            const next = preferences.languagePriority ?? [];
            const prev = languagePriority ?? [];
            languagePriority = [...next];
            if (hasLanguagePriorityChanged(prev, next))
                scheduleLanguageRedraw(next[0]);
        },
        onDiscard: () => {
            fontPreferences?.discard();
            languagePreferences?.discard();
            languageSwitcherPreferences?.discard();
            themePreferences?.discard();
            messageStylePreferences?.discard();
            offlinePreferences?.discard();
            releaseNotesPreferences?.discard();
            datetimePreferences?.discard();
            advancedPreferences?.discard();
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
