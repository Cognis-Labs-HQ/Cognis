import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import {
    importTestModule,
    loadTestModule,
} from "../../../tooling/reuse/test-module.ts";
import * as styleOptions from "../../reuse/message-style-options.js";
import { escapeHtml } from "../../reuse/escape-html.js";

export async function settingsFixture(
    context,
    { entryUrl, provider = true, translation, realStyles = false } = {},
) {
    const dom = new JSDOM("<main></main>", {
        url: "https://cognis.test/settings",
    });
    const root = dom.window.document.querySelector("main");
    const state = {
        writes: [],
        renders: [],
        stylesheets: [],
        styleSignals: [],
        errors: [],
        dirty: new Map(),
        preferences: { messageStyle: "default" },
    };
    const capabilities = new Map();
    const globals = {
        window: dom.window,
        document: dom.window.document,
        localStorage: dom.window.localStorage,
        AbortController: dom.window.AbortController,
        Event: dom.window.Event,
        CustomEvent: dom.window.CustomEvent,
        console,
        setTimeout,
    };
    const controller = new dom.window.AbortController();
    const i18n = translation ?? { t: (key) => key };
    state.translation = i18n;
    state.install = () => {
        state.providerController = new dom.window.AbortController();
        state.provider = {
            version: 2,
            available: true,
            signal: state.providerController.signal,
            stylesheets: ["/static/test/messages.css"],
            render: async (input) => {
                state.renders.push(input);
                return `<p>${escapeHtml(input.style)}</p>`;
            },
        };
        capabilities.set("social:messagePresentation", state.provider);
        dom.window.dispatchEvent(
            new dom.window.Event("cognis:message-presentation-changed"),
        );
    };
    state.remove = () => {
        state.providerController?.abort();
        capabilities.delete("social:messagePresentation");
        dom.window.dispatchEvent(
            new dom.window.Event("cognis:message-presentation-changed"),
        );
    };
    if (provider) state.install();
    const pageStyles = realStyles
        ? loadTestModule(
              new URL("../../reuse/page-styles.js", import.meta.url),
              {},
              { ...globals, URL },
          )
        : { ensurePageStylesheet: async () => {} };
    const messagePrefs = loadTestModule(
        new URL("../../app/settings/message-style-prefs.js", import.meta.url),
        {
            "../../reuse/ui-ctx.js": { uiCtx: { capabilities } },
            "../../reuse/message-style-options.js": styleOptions,
            "../../reuse/page-styles.js": {
                ensurePageStylesheet: (path, options) => {
                    state.stylesheets.push(path);
                    state.styleSignals.push(options.signal);
                    return pageStyles.ensurePageStylesheet(path, options);
                },
            },
            "../../reuse/mount-scope.js": loadTestModule(
                new URL("../../reuse/mount-scope.js", import.meta.url),
                {},
                globals,
            ),
            "../../reuse/toast.js": {
                showToast: (message) => state.errors.push(message),
            },
        },
        globals,
    );
    const neutralPrefs = () => ({
        init() {},
        commit() {},
        discard() {},
        isDirty: () => false,
    });
    const values = {
        initMessageStylePrefs: (...args) => {
            const preferences = messagePrefs.initMessageStylePrefs(...args);
            state.messagePrefs = preferences;
            return preferences;
        },
        guides: [],
        navigateTo() {},
        createLanguageRedraw: () => () => {},
        uiLanguageMembershipChanged: () => false,
        bindOnlineSettingsControls: () => () => {},
        loadUiPreferences: async () => state.preferences,
        saveUiPreferences: async (prefs) => {
            state.writes.push(prefs);
            state.preferences = prefs;
        },
        applyUiPreferences: (prefs) => {
            dom.window.document.documentElement.dataset.messageStyle =
                prefs.messageStyle;
        },
        isOffline: () => false,
        apiFetch: async () => Response.json({ data: [] }),
        applyDocumentTitle() {},
        createI18n: async () => state.translation,
        extendI18n: async () => i18n,
        readLanguagePriorityMode: () => "auto",
        readPreferredLanguages: () => ["en"],
        setPreferredLanguages() {},
        applyTheme() {},
        persistTheme() {},
        getStoredTheme: () => "light",
        toFontFamilyValue: (value) => value,
        DEFAULT_FONT_SIZE: 16,
        initFontPrefs: () => ({
            ...neutralPrefs(),
            getFont: () => "system",
            getFontSize: () => 16,
        }),
        initLanguagePrefs: neutralPrefs,
        initCheckboxPrefs: neutralPrefs,
        initGeneralPrefs: neutralPrefs,
        initDateTimePrefs: neutralPrefs,
        initReleaseChangelogPrefs: neutralPrefs,
        shouldShowReleaseChangelog: () => true,
        applyTimeFormatToLocalStorage() {},
        applyTimezoneToLocalStorage() {},
        createUnsavedChangesBar: (_slot, actions) => {
            state.save = actions.onSave;
            state.discard = actions.onDiscard;
            return { markDirty: (key, dirty) => state.dirty.set(key, dirty) };
        },
        initAdvancedPrefs: neutralPrefs,
        loadEditorAcknowledgement: async () => false,
        saveEditorAcknowledgement() {},
        registerSearchIndex() {},
        mountWhenDirect: async () => {},
        showToast: (text, options) => {
            if (options.variant === "error") state.errors.push(text);
        },
        escapeHtml,
        renderInfoTooltip: () => "",
        ...styleOptions,
        loadDynamicContributions: async () => [],
        renderStructuredContent: () => "",
        collectSettingsSearchGroups: () => [],
        renderAccountOperationButton: () => "",
        getSettingsShellOptions: () => ({}),
        resolveSettingsSetupRedirect: () => null,
        createPageComposer: (_root, options) => {
            state.composer = options;
            const appearance = options.elements.find(
                ({ id }) => id === "appearance",
            ).subComposerOptions;
            state.redraw = () => {
                root.innerHTML = appearance.elements
                    .map((element) => element.render())
                    .join("");
                appearance.onRender();
            };
            return {
                init: async () => state.redraw(),
                getFloatingSlot: () => null,
            };
        },
    };
    const contract = JSON.parse(
        readFileSync(
            new URL("./settings-startup/imports.json", import.meta.url),
        ),
    );
    const imports = Object.fromEntries(
        Object.entries(contract).map(([path, names]) => [
            path,
            Object.fromEntries(names.map((name) => [name, values[name]])),
        ]),
    );
    imports["../../reuse/message-style-options.js"] = styleOptions;
    const module = await importTestModule(
        entryUrl ?? new URL("../../app/settings/index.js", import.meta.url),
        imports,
        globals,
    );
    state.mount = () => module.mount(root, { signal: controller.signal });
    await state.mount();
    context.after(() => {
        controller.abort();
        dom.window.close();
    });
    return { ...state, root, dom, controller, capabilities, state };
}

export const settle = () => new Promise((resolve) => setImmediate(resolve));
