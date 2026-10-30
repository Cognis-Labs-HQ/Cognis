import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    importTestModule,
    loadTestModule,
} from "../../../tooling/reuse/test-module.ts";
import * as filters from "../../app/modules/filters.js";
import * as presentation from "../../app/modules/presentation.js";
import * as detailRendering from "../../app/modules/detail-rendering.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { replaceMountScope } from "../../reuse/mount-scope.js";

const missing = (key) =>
    Object.assign(new Error(`missing_translation:${key}`), {
        code: "missing_translation",
        key,
    });

async function fixture(context) {
    const strings = new Map();
    for (const path of [
        "../../languages/en/strings.xml",
        "../../app/modules/languages/en/strings.xml",
    ])
        for (const [, key, value] of readFileSync(
            new URL(path, import.meta.url),
            "utf8",
        ).matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g))
            strings.set(key, value);
    const i18n = {
        locale: "en",
        t: (key) => {
            if (!strings.has(key)) throw missing(key);
            return strings.get(key);
        },
    };
    const messages = [],
        errors = [],
        operations = [],
        handlers = new Map();
    const module = (id, version) => ({
        id,
        uuid: id,
        name: `module.${id}.name`,
        summary: `module.${id}.summary`,
        description: `module.${id}.description`,
        tags: [`module.${id}.tag`],
        ui: { stringsBaseUrl: `/catalog/${id}` },
        version,
        installedVersion: version,
        installed: true,
        status: "enabled",
        installedBranch: "master",
        defaultBranch: "master",
        branches: [
            {
                name: "master",
                version: id === "study-language-ja" ? "4.0.2" : version,
                commit: "new",
            },
        ],
    });
    const initial = [
        module("study-language-ja", "4.0.1"),
        module("elevenlabs-tts", "2.0.1"),
    ];
    let waitForStrings = () => Promise.resolve();
    const localized = loadTestModule(
        new URL("../../app/modules/presentation.js", import.meta.url),
        {
            "../../reuse/i18n.js": {
                extendI18n: async (_base, url) => {
                    await waitForStrings();
                    const id = url.split("/").at(-1);
                    const bundle = new Map([
                        [
                            `module.${id}.name`,
                            id === "elevenlabs-tts"
                                ? "ElevenLabs Speech"
                                : "Japanese",
                        ],
                        [`module.${id}.summary`, "Summary"],
                        [`module.${id}.description`, "Description"],
                        [`module.${id}.tag`, "Speech"],
                    ]);
                    return {
                        t: (key) => {
                            if (!bundle.has(key)) throw missing(key);
                            return bundle.get(key);
                        },
                    };
                },
            },
        },
    );
    const catalog = loadTestModule(
        new URL("../../app/modules/catalog.js", import.meta.url),
        {
            "./assets.js": {
                loadAuthenticatedModuleAssets: async (modules) =>
                    assert.ok(Array.isArray(modules)),
            },
            "./presentation.js": localized,
        },
    );
    const window = new EventTarget();
    Object.assign(window, {
        scrollX: 0,
        scrollY: 0,
        setInterval: (callback) => {
            handlers.set("poll", callback);
            return 1;
        },
        clearInterval: () => handlers.delete("poll"),
    });
    const root = {
        addEventListener: (name, callback) => handlers.set(name, callback),
        querySelector: (selector) =>
            selector === "[data-module-sidebar]" ? sidebar : null,
    };
    const sidebar = { outerHTML: "" };
    const floating = { innerHTML: "", hidden: false };
    let composerOptions;
    const render = () => {
        composerOptions.elements[0].render();
        composerOptions.toolbar[0].render();
    };
    const unused = () => assert.fail("unexpected action");
    const scope = new AbortController();
    context.after(() => scope.abort());
    const page = await importTestModule(
        new URL("../../app/modules/index.js", import.meta.url),
        {
            "./catalog.js": catalog,
            "./filters.js": filters,
            "../../reuse/i18n.js": {
                createI18n: async () => i18n,
                applyDocumentTitle: (i18n, key) => i18n.t(key),
            },
            "../../reuse/page-composer/index.js": {
                createPageComposer: (_root, options) => {
                    composerOptions = options;
                    return {
                        init: async () => render(),
                        refreshElements: render,
                    };
                },
            },
            "../../reuse/page-composer/dom-position.js": {
                getFloatingSlot: () => floating,
                restoreWindowScrollPosition: () =>
                    assert.equal(window.scrollY, 0),
            },
            "../../reuse/escape-html.js": { escapeHtml },
            "../../reuse/popup.js": { openPopup: unused },
            "../../reuse/toast.js": {
                showToast: (message, options) =>
                    messages.push({ message, ...options }),
            },
            "../../reuse/markdown-renderer.js": { renderMarkdown: String },
            "../../reuse/button-loading.js": {
                beginButtonLoading: () => {
                    operations.push("loading");
                    return () => operations.push("finished");
                },
            },
            "../../reuse/page-entry.js": {
                beginPageLoading: () => () => operations.push("mounted"),
                mountWhenDirect: async (mount) =>
                    assert.equal(typeof mount, "function"),
            },
            "../../reuse/mount-scope.js": { replaceMountScope },
            "../../reuse/hamburger-menu.js": { openHamburgerMenu: unused },
            "../../reuse/ui-ctx.js": {
                uiCtx: { capabilities: { get: () => undefined } },
            },
            "./carousel.js": {
                initializeScreenshotCarousels: () => () =>
                    operations.push("carousel"),
                revealLoadedModulePictures: () => operations.push("pictures"),
                updateScreenshotCarousel: unused,
            },
            "./api.js": {
                loadModuleSources: async () => [],
                loadInstalledModules: async () => structuredClone(initial),
                loadCachedModules: async () => structuredClone(initial),
                loadAvailableModules: async () => ({
                    modules: structuredClone(initial),
                    sourceFailures: [],
                }),
                installModule: async (module) => {
                    operations.push(`installed:${module.id}`);
                    return { version: "4.0.2" };
                },
                setModuleEnabled: async (id, enabled) =>
                    operations.push(
                        `${enabled ? "enabled" : "disabled"}:${id}`,
                    ),
                saveModuleReleaseChannel: unused,
                uninstallModule: unused,
                deleteModuleConfig: unused,
            },
            "./activation.js": {
                activateModule: unused,
                enableModuleWithIntegrityCheck: async () => {
                    operations.push("reenabled");
                    return true;
                },
                modulePreferenceLabels: unused,
            },
            "./credentials.js": {
                resolveSourceToken: async (_keyring, source) => {
                    assert.equal(source, undefined);
                    return undefined;
                },
            },
            "./presentation.js": {
                ...presentation,
                ...localized,
                detailModuleUuid: () => "study-language-ja",
            },
            "./preferences.js": { openModulePreferences: unused },
            "./uninstall.js": { confirmModuleUninstall: unused },
            "./source-settings.js": { openMarketplaceSettings: unused },
            "./assets.js": {
                resolveModuleAssetUrl: () => "",
                loadAuthenticatedModuleAssets: async (modules) =>
                    assert.ok(Array.isArray(modules)),
            },
            "./dependencies.js": {
                confirmModuleDependencies: unused,
                resolveInstallDependencies: unused,
                resolveModuleDependencyErrorMessage: () => null,
            },
            "./release-channels.js": {
                releaseChannels: (module) => module.branches ?? [],
                selectReleaseChannel: unused,
            },
            "./polling.js": loadTestModule(
                new URL("../../app/modules/polling.js", import.meta.url),
                {},
                { window },
            ),
            "./detail-rendering.js": detailRendering,
        },
        {
            window,
            console: { error: (...args) => errors.push(args) },
            AbortController,
            CustomEvent: class extends Event {
                constructor(name, options) {
                    super(name);
                    this.detail = options.detail;
                }
            },
            Event,
        },
    );
    await page.mount(root, { signal: scope.signal });
    for (
        let pass = 0;
        pass < 20 && !floating.innerHTML.includes("data-module-update");
        pass++
    )
        await new Promise(setImmediate);
    assert.match(floating.innerHTML, /data-module-update/);
    return {
        catalog,
        i18n,
        messages,
        errors,
        operations,
        handlers,
        initial,
        localized,
        sidebar,
        stall: () => {
            let release;
            const promise = new Promise((resolve) => {
                release = resolve;
            });
            waitForStrings = () => promise;
            return release;
        },
        clickUpdate: async () => {
            const target = {
                dataset: {},
                id: "",
                hasAttribute: (name) => name === "data-module-update",
                getAttribute: () => "study-language-ja",
                closest: (selector) => (selector === "button" ? target : null),
            };
            await handlers.get("click")({ target });
        },
    };
}

test("a Japanese update can redraw safely while another module's catalog translations are pending", async (context) => {
    const state = await fixture(context);
    const release = state.stall();
    context.after(release);
    state.handlers.get("poll")();
    await new Promise(setImmediate);
    await state.clickUpdate();
    assert.deepEqual(state.errors, []);
    assert.ok(
        state.messages.some(
            ({ type, message }) =>
                type === "success" && message === "Module upgraded.",
        ),
    );
    assert.equal(
        state.messages.some(({ type }) => type === "error"),
        false,
    );
    assert.match(state.sidebar.outerHTML, /Speech/);
    assert.ok(state.operations.includes("reenabled"));
    release();
    await new Promise(setImmediate);
});

test("discovery prepares detached copies and preserves the published catalog on a missing translation", async (context) => {
    const state = await fixture(context);
    const published = await state.catalog.prepareInstalledCatalog(
        state.initial,
        [],
        state.i18n,
    );
    const before = structuredClone(published);
    const release = state.stall();
    const incoming = {
        ...state.initial[1],
        name: "module.elevenlabs-tts.missing",
    };
    const pending = state.catalog.prepareDiscoveredCatalog(
        published,
        [incoming],
        state.i18n,
    );
    await new Promise(setImmediate);
    assert.deepEqual(structuredClone(published), before);
    assert.equal(
        filters.formatModuleTag(
            "module.elevenlabs-tts.tag",
            published,
            state.i18n,
        ),
        "Speech",
    );
    release();
    await assert.rejects(pending, {
        code: "missing_translation",
        key: "module.elevenlabs-tts.missing",
    });
    assert.deepEqual(structuredClone(published), before);
});

test("catalog metadata keeps its matching locale bundle when installed metadata has another namespace", async (context) => {
    const state = await fixture(context);
    const installed = {
        ...state.initial[0],
        name: "module.installed.name",
        summary: "module.installed.summary",
        ui: { stringsBaseUrl: "/installed/other" },
        status: "disabled",
    };
    const catalog = await state.catalog.prepareInstalledCatalog(
        state.initial,
        [installed],
        state.i18n,
    );
    assert.equal(catalog[0].localizedPresentation.name, "Japanese");
    assert.equal(catalog[0].name, "module.study-language-ja.name");
    assert.equal(catalog[0].status, "disabled");
    assert.equal(catalog[0].ui.stringsBaseUrl, "/installed/other");
    assert.equal(
        catalog[0].catalogPresentation.ui.stringsBaseUrl,
        "/catalog/study-language-ja",
    );
    assert.equal(state.initial[0].status, "enabled");
});
