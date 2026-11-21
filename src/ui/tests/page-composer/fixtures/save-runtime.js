import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { BROWSER_FLOW_CONTRACTS } from "../../../reuse/flow-contracts.js";

export const settle = () => new Promise((resolve) => setImmediate(resolve));

export function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((accept, fail) => {
        resolve = accept;
        reject = fail;
    });
    return { promise, resolve, reject };
}

export async function composerFixture({
    mode = "success",
    width = 1080,
    nested = false,
    locale = "en",
    initialProfiles = null,
    defaultHidden = false,
    readMode = "success",
    outerCustomization = false,
    navigation = false,
    onRender,
    elements,
    realToast = false,
    manualFrames = false,
} = {}) {
    const rootUrl = new URL(
        process.env.COGNIS_COMPOSER_TEST_ROOT ?? "../../../../../",
        import.meta.url,
    );
    const window = new JSDOM(
        '<!doctype html><html lang="en"><body><div id="app"></div></body></html>',
        {
            url: "https://fixture.invalid/dashboard",
            pretendToBeVisual: true,
        },
    ).window;
    const document = window.document;
    window.matchMedia = (query) =>
        Object.assign(new window.EventTarget(), {
            matches: query.includes("max-width") ? width <= 640 : false,
        });
    window.scrollTo = () => {};
    window.HTMLElement.prototype.setPointerCapture = () => {};
    window.HTMLElement.prototype.getBoundingClientRect = function () {
        return {
            x: 0,
            y: 100,
            left: 0,
            top: 100,
            right: width,
            bottom: 700,
            width,
            height: 600,
        };
    };
    Object.defineProperty(window, "innerWidth", { value: width });
    const resizeObservers = [];
    const frames = [];
    class ResizeObserver {
        constructor(callback) {
            this.callback = callback;
            this.targets = new Set();
            resizeObservers.push(this);
        }
        observe(target) {
            this.targets.add(target);
        }
        unobserve(target) {
            this.targets.delete(target);
        }
        disconnect() {
            this.targets.clear();
        }
    }
    window.ResizeObserver = ResizeObserver;
    const requests = [];
    const logs = [];
    const toasts = [];
    const flowEvents = [];
    const errors = [];
    document.defaultView.addEventListener("error", (event) =>
        errors.push(event.error),
    );
    const capabilities = new Map();
    const hooks = new Map();
    capabilities.set("ui:log", (level, message, metadata) =>
        logs.push({ level, message, metadata }),
    );
    const ctx = {
        capabilities: {
            get: (name) => capabilities.get(name),
            contribute(name, value) {
                assert.ok(!capabilities.has(name), name);
                capabilities.set(name, value);
                return true;
            },
        },
        extendFlow(name, stage, metadata, handler) {
            assert.ok(
                BROWSER_FLOW_CONTRACTS[name]?.includes(stage),
                `${name}:${stage}`,
            );
            const key = `${name}:${stage}`;
            if (!hooks.has(key)) hooks.set(key, []);
            hooks.get(key).push({ ...metadata, handler });
        },
        async runFlow(name, input) {
            assert.ok(
                BROWSER_FLOW_CONTRACTS[name],
                `Unregistered flow ${name}`,
            );
            const result = {};
            for (const stage of BROWSER_FLOW_CONTRACTS[name]) {
                const registered = hooks.get(`${name}:${stage}`) ?? [];
                assert.ok(
                    registered.length,
                    `Missing executable fixture hook ${name}:${stage}`,
                );
                for (const hook of [...registered].sort(
                    (left, right) => (left.order ?? 0) - (right.order ?? 0),
                )) {
                    result[stage] = await hook.handler({
                        input,
                        results: result,
                    });
                }
            }
            return result;
        },
    };
    ctx.extendFlow(
        "page:mounted",
        "publish",
        { id: "fixture:observeMounted" },
        ({ input }) => {
            assert.equal(input.root.isConnected, true);
            assert.equal(input.pathname, "/dashboard");
            flowEvents.push({ flow: "page:mounted", stage: "publish" });
            return { observed: true };
        },
    );
    const original = {
        placements: [
            { id: "fixture-a", col: 0, row: 0, w: 2, h: 2 },
            { id: "fixture-b", col: 2, row: 0, w: 2, h: 2 },
        ],
        hidden: [],
    };
    let stored = initialProfiles ?? {
        layoutsByGrid: {
            [`cols-${Math.floor(width / 90)}`]: structuredClone(original),
        },
    };
    let currentMode = mode;
    const pending = [];
    const preferenceKey = nested ? "nested-layout" : "dashboard-layout";
    const apiPath = `/api/v1/social/users/synthetic-account/preferences/${preferenceKey}`;
    async function fetch(path, options = {}) {
        if (/^\/static\/languages\/(en|de|id|ja)\/strings.xml$/.test(path)) {
            const language = path.split("/")[3];
            return new Response(
                readFileSync(
                    new URL(
                        `src/ui/languages/${language}/strings.xml`,
                        rootUrl,
                    ),
                    "utf8",
                ),
            );
        }
        if (path === "/api/v1/system/healthcheck") {
            requests.push({ path, method: "GET", healthProbe: true });
            return Response.json({ ok: true });
        }
        if (nested && path.endsWith("/preferences/dashboard-layout")) {
            assert.equal(options.method ?? "GET", "GET");
            return Response.json({ data: { layoutJson: null } });
        }
        if (navigation && path.endsWith("/preferences/other-layout")) {
            assert.equal(options.method ?? "GET", "GET");
            return Response.json({
                data: {
                    layoutJson: JSON.stringify({
                        layoutsByGrid: { "cols-12": original },
                    }),
                },
            });
        }
        assert.equal(path, apiPath, "Unexpected network request");
        const method = options.method ?? "GET";
        assert.ok(["GET", "PUT"].includes(method), method);
        const body = options.body ? JSON.parse(options.body) : null;
        requests.push({ path, method, body });
        if (method === "GET") {
            if (readMode === "500")
                return Response.json({ error: "synthetic" }, { status: 500 });
            if (readMode === "malformed") return new Response("not-json");
            if (readMode === "invalid-layout")
                return Response.json({ data: { layoutJson: "not-json" } });
            return Response.json({
                data: { layoutJson: JSON.stringify(stored) },
            });
        }
        if (currentMode === "deferred") {
            const completion = deferred();
            pending.push({ ...completion, body });
            return completion.promise;
        }
        if (currentMode === "success") {
            stored = structuredClone(body.layout);
            return Response.json({ data: { saved: true } });
        }
        if (currentMode === "queued") return Response.json({ queued: true });
        if (currentMode === "malformed")
            return new Response("not-json", { status: 200 });
        if (currentMode === "false")
            return Response.json({ data: { saved: false } });
        if (currentMode === "wrong-shape")
            return Response.json({
                data: { layoutJson: JSON.stringify(stored) },
            });
        if (currentMode === "202")
            return Response.json({ data: { saved: true } }, { status: 202 });
        if (currentMode === "204") return new Response(null, { status: 204 });
        if (currentMode === "accepted-response-lost")
            stored = structuredClone(body.layout);
        if (["rejected", "accepted-response-lost"].includes(currentMode))
            throw new TypeError("Synthetic response unavailable");
        return Response.json(
            { error: "synthetic_save_rejected" },
            { status: Number(currentMode) },
        );
    }
    window.localStorage.setItem("cognis_account", "synthetic-account");
    window.localStorage.setItem("cognis_access_token", "fixture-noncredential");
    const sandbox = vm.createContext({
        window,
        document,
        history: window.history,
        localStorage: window.localStorage,
        navigator: window.navigator,
        HTMLElement: window.HTMLElement,
        Element: window.Element,
        Node: window.Node,
        HTMLInputElement: window.HTMLInputElement,
        HTMLButtonElement: window.HTMLButtonElement,
        HTMLTextAreaElement: window.HTMLTextAreaElement,
        HTMLSelectElement: window.HTMLSelectElement,
        CustomEvent: window.CustomEvent,
        DOMParser: window.DOMParser,
        MutationObserver: window.MutationObserver,
        AbortController: window.AbortController,
        AbortSignal: window.AbortSignal,
        ResizeObserver,
        URL,
        Response,
        Headers,
        crypto: window.crypto,
        fetch,
        CSS: {
            escape(value) {
                assert.match(value, /^[a-z0-9-]+$/);
                return value;
            },
        },
        getComputedStyle: window.getComputedStyle.bind(window),
        requestAnimationFrame: manualFrames
            ? (callback) => {
                  frames.push(callback);
                  return frames.length;
              }
            : window.requestAnimationFrame.bind(window),
        setTimeout: window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window),
        setInterval: window.setInterval.bind(window),
        clearInterval: window.clearInterval.bind(window),
        console: Object.fromEntries(
            ["info", "warn", "error", "log"].map((level) => [
                level,
                (...args) => logs.push({ level, args }),
            ]),
        ),
    });
    const boundaries = new Map([
        ["src/ui/reuse/ui-ctx.js", { uiCtx: ctx }],
        [
            "src/ui/reuse/offline-state.js",
            {
                isOffline: () => false,
                isOfflineTransition: () => false,
                offlineEnabled: () => false,
                setOffline: () => assert.fail("Offline state must not change"),
            },
        ],
        [
            "src/ui/reuse/toast.js",
            {
                configureToastDismissLabel: (label) => assert.ok(label),
                showToast: (message, options) => {
                    toasts.push({ message, options });
                    return () => {};
                },
            },
        ],
        [
            "src/ui/layouts/dashboard-layout.js",
            {
                renderDashboardLayout: async (root, options) => {
                    assert.equal(options.requireAccountSession, false);
                    root.innerHTML = `<div class="app-shell"><div class="global-topbar"><button id="composer-edit-toggle" type="button"></button><div data-page-action-dock></div>${options.toolbar ?? ""}</div><div class="workspace"><main class="main-window"><div class="content-grid"></div></main></div></div>`;
                },
            },
        ],
    ]);
    if (realToast) boundaries.delete("src/ui/reuse/toast.js");
    const modules = new Map();
    function load(identifier) {
        if (modules.has(identifier)) return modules.get(identifier);
        const boundary = boundaries.get(identifier);
        assert.ok(
            boundary || identifier.startsWith("src/ui/reuse/"),
            `Unexpected source: ${identifier}`,
        );
        const module = boundary
            ? new vm.SyntheticModule(
                  Object.keys(boundary),
                  function () {
                      for (const [name, value] of Object.entries(boundary))
                          this.setExport(name, value);
                  },
                  { context: sandbox, identifier },
              )
            : new vm.SourceTextModule(
                  readFileSync(new URL(identifier, rootUrl), "utf8"),
                  {
                      context: sandbox,
                      identifier,
                  },
              );
        modules.set(identifier, module);
        return module;
    }
    async function importModule(identifier) {
        const module = load(identifier);
        if (module.status === "unlinked")
            await module.link((specifier, referring) => {
                const resolved = new URL(
                    specifier,
                    new URL(referring.identifier, rootUrl),
                );
                assert.ok(
                    resolved.href.startsWith(rootUrl.href),
                    resolved.href,
                );
                return load(resolved.href.slice(rootUrl.href.length));
            });
        if (module.status !== "evaluated") await module.evaluate();
        return module.namespace;
    }
    const { createI18n } = await importModule("src/ui/reuse/i18n.js");
    const i18n = await createI18n({
        preferredLanguages: [locale],
        persistLocale: false,
    });
    const { createPageComposer } = await importModule(
        "src/ui/reuse/page-composer/index.js",
    );
    const root = document.querySelector("#app");
    let lifetime;
    let composer;
    const fixtureElements =
        elements ??
        ["fixture-a", "fixture-b"].map((id) => ({
            id,
            label: id,
            render: () =>
                `<input data-draft-persist name="${id}" value="original">`,
            defaultHidden: defaultHidden && id === "fixture-b",
            gridSize: { default: [2, 2], min: [1, 1], max: [4, 4] },
        }));
    async function mount() {
        lifetime = new window.AbortController();
        composer = createPageComposer(root, {
            i18n,
            preferenceKey: "dashboard-layout",
            allowCustomization: !nested || outerCustomization,
            requireAccountSession: false,
            enableAccountEnhancements: false,
            signal: lifetime.signal,
            onRender: nested ? undefined : onRender,
            pageContext: {
                title: "Synthetic dashboard",
                subtitle: "Synthetic layout controls",
            },
            subPageNavigation: nested,
            toolbar: navigation
                ? [
                      {
                          render: () =>
                              '<button data-composer-scroll="fixture-section">First</button><button data-composer-scroll="other-section">Other</button>',
                      },
                  ]
                : [],
            elements: nested
                ? [
                      {
                          id: "fixture-section",
                          label: "Section",
                          render: () =>
                              '<div class="sub-composer-inner"></div>',
                          subComposerOptions: {
                              preferenceKey,
                              allowCustomization: true,
                              elements: fixtureElements,
                              onRender,
                          },
                      },
                      ...(navigation
                          ? [
                                {
                                    id: "other-section",
                                    label: "Other",
                                    render: () =>
                                        '<div class="sub-composer-inner"></div>',
                                    subComposerOptions: {
                                        preferenceKey: "other-layout",
                                        allowCustomization: true,
                                        elements: fixtureElements,
                                        onRender,
                                    },
                                },
                            ]
                          : []),
                  ]
                : fixtureElements,
        });
        await composer.init();
        await settle();
    }
    await mount();
    function snapshot() {
        const beforeUnload = new window.Event("beforeunload", {
            cancelable: true,
        });
        window.dispatchEvent(beforeUnload);
        return {
            visible: [
                ...new Set(
                    [
                        ...root.querySelectorAll(
                            ".widget-card[data-composer-element], .composer-cell[data-composer-element]",
                        ),
                    ]
                        .map((node) => node.dataset.composerElement)
                        .filter(
                            (id) =>
                                id.startsWith("fixture-") &&
                                id !== "fixture-section",
                        ),
                ),
            ].sort(),
            editorPresent: Boolean(document.querySelector(".composer-panel")),
            toggleTitle: root.querySelector("#composer-edit-toggle").title,
            leaveProtected: beforeUnload.defaultPrevented,
            hiddenControls: root.querySelectorAll(".composer-close-btn").length,
            writes: requests.filter((request) => request.method === "PUT")
                .length,
            toasts: toasts.map(({ message }) => message),
        };
    }
    return {
        window,
        document,
        root,
        resizeObservers,
        get composer() {
            return composer;
        },
        requests,
        logs,
        toasts,
        flowEvents,
        errors,
        pending,
        modules,
        resize(nextWidth) {
            width = nextWidth;
            for (const observer of [...resizeObservers]) {
                if (observer.targets.size)
                    observer.callback(
                        [...observer.targets].map((target) => ({
                            target,
                            contentRect: target.getBoundingClientRect(),
                        })),
                        observer,
                    );
            }
        },
        snapshot,
        i18n,
        flushFrames() {
            for (let turn = 0; frames.length && turn < 10; turn++) {
                for (const callback of frames.splice(0)) callback(0);
            }
            assert.equal(frames.length, 0, "Unexpected persistent frame loop");
        },
        importModule,
        setStored(value) {
            stored = structuredClone(value);
        },
        setMode(value) {
            currentMode = value;
        },
        stored() {
            return structuredClone(stored);
        },
        edit() {
            root.querySelector("#composer-edit-toggle").click();
        },
        hide(id) {
            root.querySelector(
                `[data-composer-element="${id}"].composer-cell .composer-close-btn`,
            ).click();
        },
        done(control = "panel") {
            (control === "panel"
                ? document.querySelector(".composer-done-btn")
                : root.querySelector("#composer-edit-toggle")
            ).click();
        },
        abort() {
            lifetime.abort();
        },
        complete(index = 0, status = 200) {
            const operation = pending[index];
            assert.ok(operation);
            if (status === 200) stored = structuredClone(operation.body.layout);
            operation.resolve(
                Response.json(
                    status === 200
                        ? { data: { saved: true } }
                        : { error: "synthetic" },
                    { status },
                ),
            );
        },
        async remount() {
            lifetime.abort();
            root.innerHTML = "";
            await mount();
        },
        dispose() {
            lifetime.abort();
            window.close();
        },
    };
}
