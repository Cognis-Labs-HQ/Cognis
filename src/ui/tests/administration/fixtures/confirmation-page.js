import { installAuthenticationFlow } from "./flows.js";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { popupFixture } from "../../../reuse/tests/popup/dom-fixture.js";

export async function confirmationPage(
    context,
    {
        locale = "en",
        enabled = true,
        gatewayEnabled = enabled,
        hasAdapters = true,
        requires = [],
        includeModule = false,
        required = false,
        locked = false,
        navbarRefresh = async () => {},
        adapterName = "Synthetic Adapter",
    } = {},
) {
    const popup = await popupFixture(context);
    const { window, document } = popup;
    const root = document.createElement("main");
    document.body.append(root);
    const sourceRoot = new URL("../../../", import.meta.url);
    const catalog = async (language) => {
        const xml = new window.DOMParser().parseFromString(
            await readFile(
                new URL(`languages/${language}/strings.xml`, sourceRoot),
                "utf8",
            ),
            "text/xml",
        );
        return new Map(
            [...xml.querySelectorAll("string")].map((entry) => [
                entry.getAttribute("name"),
                entry.textContent,
            ]),
        );
    };
    const english = await catalog("en");
    const preferred = await catalog(locale);
    const i18n = {
        t(key) {
            const value = preferred.get(key) || english.get(key);
            assert.ok(value, `Missing translation ${key}`);
            return value;
        },
    };
    const modules = [
        {
            id: "synthetic-module",
            name: "Synthetic Module",
            status: enabled ? "enabled" : "disabled",
            requires,
        },
    ];
    const gateways = [
        {
            id: "synthetic-gateway",
            name: "Synthetic Gateway",
            status: gatewayEnabled ? "active" : "disabled",
            hasAdapters,
            required,
            requires,
        },
        {
            id: "synthetic-dependency",
            name: "Synthetic Dependency",
            status: "disabled",
            hasAdapters: false,
        },
    ];
    const adapters = [
        {
            id: "synthetic-adapter",
            name: adapterName,
            enabled,
            locked,
            requires,
            controls: {
                enable: "/synthetic/adapter/enable",
                disable: "/synthetic/adapter/disable",
            },
        },
    ];
    const requests = [],
        dialogs = [],
        events = [];
    let responseHandler;
    let composerOptions;
    let contributionOptions;
    let dirty = false;
    let discarded = 0;
    let refreshes = 0;
    const lifetime = new window.AbortController();
    context.after(() => lifetime.abort());
    const transport = async (url, options = {}) => {
        const request = { url, ...options, method: options.method || "GET" };
        requests.push(request);
        const custom = await responseHandler?.(request);
        if (custom) return custom;
        if (url.startsWith("/static/templates/administration/")) {
            const filename = url.slice("/static/".length);
            return new Response(
                await readFile(
                    new URL(`public/${filename}`, sourceRoot),
                    "utf8",
                ),
            );
        }
        if (request.method !== "GET") {
            if (url.includes("/modules/synthetic-module/"))
                modules[0].status = url.endsWith("/enable")
                    ? "enabled"
                    : "disabled";
            if (url.includes("/gateways/")) {
                const gateway = gateways.find((entry) =>
                    url.includes(`/${entry.id}/`),
                );
                assert.ok(gateway);
                gateway.status = url.endsWith("/enable")
                    ? "active"
                    : "disabled";
            }
            if (url.startsWith("/synthetic/adapter/"))
                adapters[0].enabled = url.endsWith("/enable");
            return Response.json({});
        }
        const data =
            url === "/api/v1/modules"
                ? modules
                : url === "/api/v1/gateways"
                  ? gateways
                  : url.endsWith("/adapters")
                    ? adapters
                    : url === "/api/v1/admin/sections"
                      ? [{ id: "synthetic-draft" }]
                      : [];
        return Response.json({ data });
    };
    const sharedPopup = await popup.importModule("popup.js");
    const openPopup = (options) => {
        dialogs.push(options);
        return sharedPopup.openPopup(options);
    };
    const i18nBoundary = {
        createI18n: async () => i18n,
        extendI18n: async (value) => value,
        applyDocumentTitle() {},
    };
    function renderComponents() {
        const components = composerOptions.elements.find(
            (element) => element.id === "components",
        ).subComposerOptions;
        root.innerHTML = `<section id="components">${components.elements[0].render()}</section><aside><button data-action="save"></button><button data-action="discard"></button></aside>`;
        if (includeModule) {
            const input = document.createElement("input");
            input.type = "checkbox";
            input.dataset.module = "synthetic-module";
            input.checked = modules[0].status === "enabled";
            root.querySelector("#components").append(input);
        }
        components.onRender();
    }
    popup.capabilities.set("ui:log", (...args) => events.push(args));
    const flows = installAuthenticationFlow(popup.ctx);
    const boundaries = new Map([
        ["reuse/i18n.js", i18nBoundary],
        ["reuse/ui-ctx.js", { uiCtx: popup.ctx }],
        [
            "reuse/offline-state.js",
            {
                isOffline: () => false,
                offlineEnabled: () => false,
                setOffline: () => assert.fail("No offline fallback expected"),
            },
        ],
        ["reuse/page-entry.js", { mountWhenDirect: async () => {} }],
        ["reuse/popup.js", { ...sharedPopup, openPopup }],
        ["reuse/toast.js", { showToast: (...args) => events.push(args) }],
        ["layouts/dashboard-layout.js", { updateNavbarAvatar: navbarRefresh }],
        [
            "reuse/dynamic-contribution-loader.js",
            {
                loadDynamicContribution: async (metadata, options) => {
                    contributionOptions = await options.buildArgs(metadata);
                    return {
                        id: metadata.id,
                        label: "Synthetic draft",
                        subComposerOptions: { elements: [] },
                        isDirty: () => dirty,
                        discard() {
                            dirty = false;
                            discarded++;
                            contributionOptions.onDirtyChange(
                                metadata.id,
                                false,
                            );
                        },
                    };
                },
            },
        ],
        [
            "app/administration/security.js",
            {
                initSecuritySection: () => ({
                    isDirty: () => false,
                    discard() {},
                    renderContent: () => "",
                    refresh: async () => {},
                }),
            },
        ],
        [
            "reuse/page-composer/index.js",
            {
                createPageComposer: (element, options) => {
                    assert.equal(element, root);
                    composerOptions = options;
                    return {
                        init: async () => renderComponents(),
                        refresh: () => {
                            refreshes++;
                            renderComponents();
                        },
                        getFloatingSlot: () => root.querySelector("aside"),
                    };
                },
            },
        ],
    ]);
    const sandbox = vm.createContext({
        window,
        document,
        console,
        Response,
        Headers,
        CustomEvent: window.CustomEvent,
        AbortSignal: window.AbortSignal,
        fetch: transport,
        structuredClone,
        URL,
        HTMLInputElement: window.HTMLInputElement,
        HTMLElement: window.HTMLElement,
        HTMLDetailsElement: window.HTMLDetailsElement,
        AbortController: window.AbortController,
        Event: window.Event,
        localStorage: window.localStorage,
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
    });
    const loaded = new Map();
    async function load(identifier) {
        if (loaded.has(identifier)) return loaded.get(identifier);
        const boundary = boundaries.get(identifier);
        const module = boundary
            ? new vm.SyntheticModule(
                  Object.keys(boundary),
                  function () {
                      for (const [key, value] of Object.entries(boundary))
                          this.setExport(key, value);
                  },
                  { context: sandbox, identifier },
              )
            : new vm.SourceTextModule(
                  await readFile(new URL(identifier, sourceRoot), "utf8"),
                  { context: sandbox, identifier },
              );
        loaded.set(identifier, module);
        return module;
    }
    const page = await load("app/administration/index.js");
    await page.link((specifier, referencing) =>
        load(
            new URL(
                specifier,
                new URL(referencing.identifier, sourceRoot),
            ).href.slice(sourceRoot.href.length),
        ),
    );
    await page.evaluate();
    await page.namespace.mount(root, { signal: lifetime.signal });
    const selectors = {
        module: "input[data-module]",
        gateway: "input[data-gateway]:not([data-adapter])",
        adapter: "input[data-adapter]",
    };
    return {
        ...popup,
        root,
        requests,
        dialogs,
        events,
        i18n,
        writes: () => requests.filter((request) => request.method !== "GET"),
        toggle: (kind) => root.querySelector(selectors[kind]),
        change(kind, checked) {
            const toggle = root.querySelector(selectors[kind]);
            toggle.checked = checked;
            toggle.dispatchEvent(new window.Event("change", { bubbles: true }));
            return toggle;
        },
        abort: () => lifetime.abort(),
        remount: () => page.namespace.mount(root, { signal: lifetime.signal }),
        leaveComponents: () =>
            composerOptions.elements
                .find((element) => element.id === "components")
                .subComposerOptions.onUnmount?.(),
        sessionChanged: () => popup.ctx.runFlow("authenticate-session", {}),
        hookCount: () =>
            flows.get("authenticate-session").get("afterSession").size,
        flows,
        rebind: () =>
            composerOptions.elements
                .find((element) => element.id === "components")
                .subComposerOptions.onRender(),
        intercept: (handler) => {
            responseHandler = handler;
        },
        edit() {
            dirty = true;
            contributionOptions.onDirtyChange("synthetic-draft", true);
        },
        navigate: () => composerOptions.onBeforeSubPageSwitch(),
        discards: () => discarded,
        isDirty: () => dirty,
        refreshes: () => refreshes,
        async waitForPopup() {
            const deadline = Date.now() + 5000;
            while (!popup.active().length && Date.now() < deadline)
                await new Promise((resolve) => setTimeout(resolve, 5));
            assert.ok(popup.active().length, "Expected popup to become ready");
            return popup.active().at(-1);
        },
        async decide(id) {
            await popup.settle();
            const overlay = popup.active().at(-1);
            assert.ok(overlay);
            overlay.querySelector(`[data-popup-action="${id}"]`).click();
            await popup.settle();
            await popup.settle();
        },
    };
}
