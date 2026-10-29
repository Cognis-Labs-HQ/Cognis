import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import test from "node:test";
import { isMountSignal, replaceMountScope } from "../mount-scope.js";
import assert from "node:assert/strict";
import vm from "node:vm";

function createRouter({
    allowNavigation = true,
    routes,
    prepareStyles,
    onError,
    beginLoading,
    prepareProviders,
    runFlow,
    offline = false,
    allowOfflineRoute = async () => true,
} = {}) {
    const listeners = new Map();
    const capabilities = new Map();
    const assigned = [];
    const navigationEvents = [];
    const mounted = [];
    const root = { textContent: "Login" };
    const location = new URL("https://cognis.test/login?reason=expired");
    const window = {
        location: Object.assign(location, {
            assign: (path) => assigned.push(path),
        }),
        addEventListener: (type, callback) => listeners.set(type, callback),
        dispatchEvent: (event) => {
            navigationEvents.push(event);
            return allowNavigation;
        },
    };
    const history = {
        state: null,
        replaceState(state) {
            this.state = state;
        },
        pushState(state, _title, path) {
            this.state = state;
            window.location.href = new URL(path, location).href;
        },
    };
    const sandbox = {
        window,
        history,
        URL,
        AbortController,
        performance,
        console,
        document: {
            querySelector: () => root,
            querySelectorAll: () => [],
            addEventListener: (type, callback) => listeners.set(type, callback),
        },
        CustomEvent: class {
            constructor(type, options) {
                this.type = type;
                Object.assign(this, options);
            }
        },
        uiCtx: {
            runFlow,
            capabilities: {
                contribute: (name, value) => capabilities.set(name, value),
                get: (name) => capabilities.get(name),
            },
        },
        adoptPageStylesheets() {},
        isMountSignal,
        preparePageStylesheets:
            prepareStyles ||
            (async () => Object.assign(() => {}, { cancel() {} })),
        beginPageLoading: beginLoading || (() => () => {}),
        ensureHostUiProviders: prepareProviders || (async () => {}),
        loadWithSpaImportGuard: (load) => load(),
        getCurrentRoutePath: () =>
            `${location.pathname}${location.search}${location.hash}`,
        clearSpaRouteCache() {},
        loadSpaRoutes: async () =>
            routes || [
                {
                    pattern: /^\/terms-of-service$/,
                    base: "/terms-of-service",
                    public: true,
                    load: async () => ({
                        mount: async (target) => {
                            target.textContent = "Terms";
                            mounted.push("Terms");
                        },
                    }),
                },
            ],
        installRuntimeErrorHandlers() {},
        openRuntimeErrorPopup: async ({ error }) => {
            if (onError) return onError(error);
            throw error;
        },
        isGuestAllowedPath: () => false,
        installComponentPageBroker() {},
        isOffline: () => (typeof offline === "function" ? offline() : offline),
        offlineWorkerRequest: async () => [],
        createI18n: async () => ({ t: (key) => key }),
        observePerformance() {},
        recordRouteMount() {},
    };
    vm.createContext(sandbox);
    sandbox.router = loadTestModule(
        new URL("../app-router.js", import.meta.url),
        {
            "./offline-state.js": sandbox,
            "./offline-route-assets.js": { prepareOfflineRouteAssets() {} },
            "./offline-unavailable.js": {
                showOfflineUnavailable: async () => {
                    root.textContent = "Offline unavailable";
                },
            },
            "./offline-navigation.js": {
                allowOfflineRoute,
                recoverOfflineNavigation: async ({ restore, fallback }) => {
                    const restored = await restore();
                    if (!restored) await fallback?.();
                    return restored;
                },
                offlineRouteAvailable: () => false,
            },
            "./page-styles.js": sandbox,
            "./mount-scope.js": sandbox,
            "./page-entry.js": sandbox,
            "./route-path.js": sandbox,
            "./spa-route-registry.js": sandbox,
            "./runtime-error-popup.js": sandbox,
            "./guest-blocked-popup.js": sandbox,
            "./ui-ctx.js": sandbox,
            "./component-page-broker.js": sandbox,
            "./performance-telemetry.js": sandbox,
            "./page-flow-catalog.js": sandbox,
        },
        sandbox,
    );
    sandbox.router.initRouter(root);
    return {
        ...sandbox.router,
        listeners,
        assigned,
        root,
        location,
        mounted,
        navigationEvents,
        capabilities,
    };
}

function click(target = "", modifiers = {}) {
    return {
        button: 0,
        target: {
            closest: () => ({
                target,
                hasAttribute: () => false,
                getAttribute: () => "/terms-of-service",
            }),
        },
        defaultPrevented: false,
        preventDefault() {
            this.defaultPrevented = true;
        },
        ...modifiers,
    };
}

test("Back to the server-rendered login route loads its document including search", async () => {
    const router = createRouter();
    await router.navigateTo("/terms-of-service");
    assert.equal(router.root.textContent, "Terms");
    router.location.href = "https://cognis.test/login?reason=expired";
    await router.listeners.get("popstate")({ state: { routerIndex: 0 } });
    assert.deepEqual(router.assigned, ["/login?reason=expired"]);
});

test("new tabs and modified clicks retain browser navigation; ordinary clicks mount", async () => {
    const router = createRouter();
    const onClick = router.listeners.get("click");
    for (const event of [
        click("_blank"),
        click("", { ctrlKey: true }),
        click("", { metaKey: true }),
        click("", { button: 1 }),
    ]) {
        await onClick(event);
        assert.equal(event.defaultPrevented, false);
    }
    assert.equal(router.mounted.length, 0);
    const event = click();
    await onClick(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(router.root.textContent, "Terms");
});

test("missing share renderers decline navigation without leaving the current page", async () => {
    const router = createRouter();
    assert.equal(
        await router.navigateTo("/disabled-provider/shared-content"),
        false,
    );
    assert.deepEqual(router.assigned, []);
    assert.equal(router.root.textContent, "Login");
    assert.equal(router.location.pathname, "/login");
});

function deferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

function routeFixture(path, mount) {
    return {
        pattern: new RegExp(`^${path}$`),
        base: path,
        public: true,
        stylesheets: [path + ".css"],
        load: async () => ({ mount }),
    };
}

test("route style commit waits for destination readiness and superseded mounts cannot commit", async () => {
    const entered = deferred();
    const release = deferred();
    const committed = [];
    const canceled = [];
    const router = createRouter({
        routes: [
            routeFixture("/first", async (root) => {
                root.textContent = "First";
            }),
            routeFixture("/delayed", async (root, { signal }) => {
                entered.resolve();
                await release.promise;
                if (!signal.aborted) root.textContent = "Delayed";
            }),
            routeFixture("/last", async (root) => {
                root.textContent = "Last";
            }),
        ],
        prepareStyles: async (hrefs) =>
            Object.assign(() => committed.push(hrefs[0]), {
                cancel: () => canceled.push(hrefs[0]),
            }),
    });
    await router.navigateTo("/first");
    const delayed = router.navigateTo("/delayed");
    await entered.promise;
    assert.equal(router.root.textContent, "First");
    assert.deepEqual(committed, ["/first.css"]);
    await router.navigateTo("/last");
    release.resolve();
    assert.equal(await delayed, false);
    assert.equal(router.root.textContent, "Last");
    assert.deepEqual(committed, ["/first.css", "/last.css"]);
    assert.ok(canceled.includes("/delayed.css"));
});

test("failed destination keeps outgoing styles and reports the mount failure", async () => {
    const committed = [];
    const errors = [];
    const router = createRouter({
        routes: [
            routeFixture("/first", async (root) => {
                root.textContent = "First";
            }),
            routeFixture("/failure", async () => {
                throw new Error("fixture_mount_failure");
            }),
        ],
        prepareStyles: async (hrefs) =>
            Object.assign(() => committed.push(hrefs[0]), { cancel() {} }),
        onError: (error) => errors.push(error.message),
    });
    await router.navigateTo("/first");
    assert.equal(await router.navigateTo("/failure"), false);
    assert.equal(router.root.textContent, "First");
    assert.deepEqual(committed, ["/first.css"]);
    assert.deepEqual(errors, ["fixture_mount_failure"]);
});

test("content commit accepts only the active route root and signal lineage before DOM replacement", async () => {
    const committed = [];
    let previousSignal;
    const router = createRouter({
        routes: [
            routeFixture("/first", async (root, { signal }) => {
                previousSignal = signal;
                root.textContent = "First";
            }),
            routeFixture("/next", async (root, { signal }) => {
                const commit = router.capabilities.get("navigation:commitPage");
                assert.equal(commit(root, previousSignal), false);
                assert.equal(commit({}, signal), false);
                assert.equal(commit(root), false);
                assert.deepEqual(committed, ["/first.css"]);
                const child = replaceMountScope(null, signal);
                assert.equal(commit(root, child.signal), true);
                assert.equal(root.textContent, "First");
                assert.deepEqual(committed, ["/first.css", "/next.css"]);
                root.textContent = "Next";
            }),
        ],
        prepareStyles: async (hrefs) =>
            Object.assign(() => committed.push(hrefs[0]), { cancel() {} }),
    });
    await router.navigateTo("/first");
    assert.equal(await router.navigateTo("/next"), true);
    assert.equal(
        router.capabilities.get("navigation:commitPage")(
            router.root,
            previousSignal,
        ),
        false,
    );
    assert.deepEqual(committed, ["/first.css", "/next.css"]);
});

test("loading covers provider, entry and fresh-auth stages and releases immediately on supersession", async () => {
    const providers = deferred();
    const entry = deferred();
    const entered = deferred();
    const auth = deferred();
    const authenticating = deferred();
    let active = 0;
    const router = createRouter({
        beginLoading() {
            active++;
            let finished = false;
            return () => {
                if (!finished) {
                    finished = true;
                    active--;
                }
            };
        },
        prepareProviders: () => providers.promise,
        async runFlow(name) {
            assert.equal(name, "authenticate-session");
            authenticating.resolve();
            return auth.promise;
        },
        routes: [
            {
                ...routeFixture("/slow", async () => {}),
                public: false,
                async load() {
                    entered.resolve();
                    await entry.promise;
                    return {
                        mount() {
                            assert.fail("superseded mount");
                        },
                    };
                },
            },
            routeFixture("/last", async (root) => {
                root.textContent = "Last";
            }),
        ],
    });
    const slow = router.navigateTo("/slow");
    await new Promise(setImmediate);
    assert.equal(active, 1);
    providers.resolve();
    await entered.promise;
    assert.equal(active, 1);
    entry.resolve();
    await authenticating.promise;
    assert.equal(active, 1);
    assert.equal(await router.navigateTo("/last"), true);
    assert.equal(active, 0);
    auth.resolve({ stageResults: { "resolve-session": [{}] } });
    assert.equal(await slow, false);
    assert.equal(router.root.textContent, "Last");
    assert.equal(active, 0);
});

test("entry failure releases loading before presenting its error popup", async () => {
    let active = false;
    const router = createRouter({
        beginLoading() {
            active = true;
            return () => {
                active = false;
            };
        },
        routes: [
            {
                ...routeFixture("/broken", async () => {}),
                load: async () => {
                    throw new Error("entry failed");
                },
            },
        ],
        onError(error) {
            assert.equal(error.message, "entry failed");
            assert.equal(active, false);
        },
    });
    assert.equal(await router.navigateTo("/broken"), false);
    assert.equal(active, false);
});

test("absolute same-origin links stay in the SPA when offline", async () => {
    const router = createRouter({
        offline: true,
        prepareProviders: () =>
            assert.fail("offline navigation must not fetch providers"),
    });
    let prevented = false;
    const link = {
        hasAttribute: () => false,
        target: "",
        getAttribute: (name) =>
            name === "href" ? "https://cognis.test/terms-of-service" : null,
    };
    await router.listeners.get("click")({
        defaultPrevented: false,
        button: 0,
        target: { closest: () => link },
        preventDefault() {
            prevented = true;
        },
    });
    assert.equal(prevented, true);
    assert.equal(router.root.textContent, "Terms");
    assert.deepEqual(router.assigned, []);
});

for (const previousAvailable of [true, false]) {
    test(`sudden offline transition stops an unsupported page and recovers gracefully (previous available: ${previousAvailable})`, async () => {
        let offline = false;
        let stopped = false;
        const router = createRouter({
            offline: () => offline,
            allowOfflineRoute: async (route) =>
                !offline || route?.base === "/usable",
            routes: [
                routeFixture("/usable", async (root) => {
                    root.textContent = "Usable";
                }),
                routeFixture("/unsupported", async (root, { signal }) => {
                    root.textContent = "Unsupported";
                    signal.addEventListener("abort", () => {
                        stopped = true;
                    });
                }),
            ],
        });
        if (previousAvailable) await router.navigateTo("/usable");
        await router.navigateTo("/unsupported");
        offline = true;
        router.listeners.get("cognis:connectivity-changed")();
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(stopped, true);
        assert.equal(
            router.root.textContent,
            previousAvailable ? "Usable" : "Offline unavailable",
        );
        assert.ok(
            router.navigationEvents.some(
                (event) => event.type === "cognis:route-will-change",
            ),
        );
    });
}

test("disabled menu destinations ignore activation before resolving or loading routes", async () => {
    for (const href of [
        "/terms-of-service",
        "/administration/modules",
        "/study/library",
    ]) {
        const router = createRouter({
            allowOfflineRoute: () =>
                assert.fail("disabled link must not start recovery"),
        });
        const event = click();
        event.target.closest = () => ({
            target: "",
            hasAttribute: () => false,
            getAttribute: (name) => (name === "aria-disabled" ? "true" : href),
        });
        await router.listeners.get("click")(event);
        assert.equal(event.defaultPrevented, true);
        assert.deepEqual(router.mounted, []);
        assert.deepEqual(router.assigned, []);
        assert.deepEqual(router.navigationEvents, []);
    }
});
