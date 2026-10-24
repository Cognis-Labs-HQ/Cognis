import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

function createRouter({ allowNavigation = true } = {}) {
    const listeners = new Map();
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
        uiCtx: { capabilities: { contribute() {}, get() {} } },
        preparePageStylesheets: async () => () => {},
        beginPageLoading: () => () => {},
        ensureHostUiProviders: async () => {},
        loadWithSpaImportGuard: (load) => load(),
        getCurrentRoutePath: () =>
            `${location.pathname}${location.search}${location.hash}`,
        clearSpaRouteCache() {},
        loadSpaRoutes: async () => [
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
            throw error;
        },
        isGuestAllowedPath: () => false,
        installComponentPageBroker() {},
        isOffline: () => false,
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
            "./offline-navigation.js": {
                allowOfflineRoute: async () => true,
                offlineRouteAvailable: () => false,
            },
            "./page-styles.js": sandbox,
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
