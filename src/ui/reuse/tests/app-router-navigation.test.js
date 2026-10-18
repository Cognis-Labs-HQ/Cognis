import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
    new URL("../app-router.js", import.meta.url),
    "utf8",
)
    .replace(/^import[\s\S]*?;\n/gm, "")
    .replace(/\bexport /g, "");

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
        observePerformance() {},
        recordRouteMount() {},
    };
    vm.createContext(sandbox);
    vm.runInContext(
        source + "\nglobalThis.router = { initRouter, navigateTo };",
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

for (const path of ["/", "/register", "/login?reason=sso_callback_failed"]) {
    test(`programmatic navigation loads the server document ${path}`, async () => {
        const router = createRouter();
        assert.equal(
            await router.navigateTo(path, { documentNavigation: true }),
            true,
        );
        assert.deepEqual(router.assigned, [path]);
    });
}

test("declined document navigation honors the host guard", async () => {
    const router = createRouter({ allowNavigation: false });
    assert.equal(
        await router.navigateTo("/register", { documentNavigation: true }),
        false,
    );
    assert.deepEqual(router.assigned, []);
});

test("programmatic navigation rejects external and executable destinations", async () => {
    const router = createRouter();
    for (const path of [
        "https://other.test/",
        "//other.test/",
        "javascript:alert(1)",
        "blob:https://cognis.test/example",
    ]) {
        assert.equal(await router.navigateTo(path), false);
    }
    assert.deepEqual(router.assigned, []);
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

test("document navigation requires an explicit caller decision", async () => {
    const router = createRouter();
    assert.equal(await router.navigateTo("/register"), false);
    assert.deepEqual(router.assigned, []);
});

test("malformed destinations resolve false without mutating navigation state", async () => {
    const router = createRouter();
    for (const path of [
        "https://[invalid",
        "http://[::1",
        "https://cognis.test:invalid/",
    ]) {
        assert.equal(await router.navigateTo(path), false);
        assert.equal(
            await router.navigateTo(path, { documentNavigation: true }),
            false,
        );
    }
    assert.deepEqual(router.assigned, []);
    assert.equal(router.location.pathname, "/login");
});

test("resuming guarded document navigation retains the explicit decision", async () => {
    const router = createRouter({ allowNavigation: false });
    assert.equal(
        await router.navigateTo("/register", { documentNavigation: true }),
        false,
    );
    const event = router.navigationEvents.find(
        (item) => item.type === "cognis:route-before-navigate",
    );
    assert.equal(await event.detail.resume(), true);
    assert.deepEqual(router.assigned, ["/register"]);
});
