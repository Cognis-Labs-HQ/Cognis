import test from "node:test";
import assert from "node:assert/strict";

import {
    beginPageLoading,
    loadWithSpaImportGuard,
    mountWhenDirect,
} from "../../page-entry.js";
import { uiCtx } from "../../ui-ctx.js";

function createMockBody() {
    const children = [];
    return {
        dataset: {},
        attributes: {},
        children,
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        append(...nodes) {
            this.children.push(...nodes);
        },
    };
}

test("page entry publishes floating windows before external pages mount", () => {
    assert.equal(
        typeof uiCtx.capabilities.get("ui:makeFloatingWindow"),
        "function",
    );
});

function createMockElement(tagName) {
    return {
        tagName,
        className: "",
        textContent: "",
        attributes: {},
        children: [],
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        getAttribute(name) {
            return this.attributes[name];
        },
        append(...nodes) {
            this.children.push(...nodes);
        },
    };
}

test("page loading helpers keep the page busy until all pending loads finish", () => {
    const originalDocument = global.document;
    const originalSetTimeout = global.setTimeout;
    const originalClearTimeout = global.clearTimeout;
    const body = createMockBody();
    const timeoutEntries = new Map();
    let nextTimeoutId = 0;
    global.document = {
        body,
        createElement(tagName) {
            return createMockElement(tagName);
        },
    };
    global.setTimeout = (callback, delay) => {
        const timerId = ++nextTimeoutId;
        timeoutEntries.set(timerId, { callback, delay });
        return timerId;
    };
    global.clearTimeout = (timerId) => {
        timeoutEntries.delete(timerId);
    };

    try {
        const finishFirstLoad = beginPageLoading();
        const finishSecondLoad = beginPageLoading();
        assert.equal(body.dataset.pageReady, "false");
        assert.equal(body.attributes["aria-busy"], "true");
        assert.equal(body.dataset.pageLoadingOverlayMounted, "true");
        assert.ok(body.children.length >= 1);
        const loadingOverlay = body.children[0];
        assert.equal(
            loadingOverlay.getAttribute("data-overlay-visible"),
            "false",
        );
        assert.equal(
            loadingOverlay.getAttribute("data-message-visible"),
            "false",
        );
        const showOverlayCallback = [...timeoutEntries.values()].find(
            ({ delay }) => delay === 120,
        )?.callback;
        showOverlayCallback?.();
        assert.equal(
            loadingOverlay.getAttribute("data-overlay-visible"),
            "true",
        );
        assert.equal(
            [...timeoutEntries.values()].some(({ delay }) => delay === 500),
            false,
            "message and spinner share the same visibility schedule",
        );
        assert.equal(
            loadingOverlay.getAttribute("data-message-visible"),
            "true",
        );

        finishFirstLoad();
        assert.equal(body.dataset.pageReady, "false");
        assert.equal(body.attributes["aria-busy"], "true");

        finishSecondLoad();
        assert.equal(body.dataset.pageReady, "true");
        assert.equal(body.attributes["aria-busy"], "false");
        assert.equal(
            loadingOverlay.getAttribute("data-overlay-visible"),
            "false",
        );
        assert.equal(
            loadingOverlay.getAttribute("data-message-visible"),
            "false",
        );
    } finally {
        global.document = originalDocument;
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
    }
});

test("mountWhenDirect wraps direct mounts with the shared loading state", async () => {
    const originalDocument = global.document;
    const originalRouterFlag = globalThis.__spaRouter;
    const body = createMockBody();
    const root = { id: "app-root" };
    let receivedRoot = null;
    global.document = {
        body,
        createElement(tagName) {
            return createMockElement(tagName);
        },
        querySelector(selector) {
            assert.equal(selector, "#app");
            return root;
        },
    };
    globalThis.__spaRouter = false;

    try {
        await mountWhenDirect(async (resolvedRoot) => {
            receivedRoot = resolvedRoot;
            assert.equal(body.dataset.pageReady, "false");
            assert.equal(body.attributes["aria-busy"], "true");
        });

        assert.equal(receivedRoot, root);
        assert.equal(body.dataset.pageReady, "true");
        assert.equal(body.attributes["aria-busy"], "false");
    } finally {
        global.document = originalDocument;
        globalThis.__spaRouter = originalRouterFlag;
    }
});

test("mountWhenDirect clears loading state when direct mount throws", async () => {
    const originalDocument = global.document;
    const originalRouterFlag = globalThis.__spaRouter;
    const body = createMockBody();
    const root = { id: "app-root" };
    global.document = {
        body,
        createElement(tagName) {
            return createMockElement(tagName);
        },
        querySelector() {
            return root;
        },
    };
    globalThis.__spaRouter = false;

    try {
        await mountWhenDirect(async () => {
            throw new Error("direct mount failed");
        });
        assert.equal(body.dataset.pageReady, "true");
        assert.equal(body.attributes["aria-busy"], "false");
    } finally {
        global.document = originalDocument;
        globalThis.__spaRouter = originalRouterFlag;
    }
});

test("mountWhenDirect skips direct mounting during SPA router loads", async () => {
    const originalRouterFlag = globalThis.__spaRouter;
    globalThis.__spaRouter = true;

    let mounted = false;
    await mountWhenDirect(async () => {
        mounted = true;
    });

    assert.equal(mounted, false);

    globalThis.__spaRouter = originalRouterFlag;
});

test("SPA import guard remains active until every concurrent import settles", async () => {
    const originalRouterFlag = globalThis.__spaRouter;
    const originalRouterCount = globalThis.__spaRouterCount;
    let releaseFirst;
    let releaseSecond;
    try {
        globalThis.__spaRouter = false;
        globalThis.__spaRouterCount = 0;
        const first = loadWithSpaImportGuard(
            () => new Promise((resolve) => (releaseFirst = resolve)),
        );
        const second = loadWithSpaImportGuard(
            () => new Promise((resolve) => (releaseSecond = resolve)),
        );
        assert.equal(globalThis.__spaRouterCount, 2);
        assert.equal(globalThis.__spaRouter, true);
        releaseFirst("first");
        assert.equal(await first, "first");
        assert.equal(globalThis.__spaRouterCount, 1);
        assert.equal(globalThis.__spaRouter, true);
        releaseSecond("second");
        assert.equal(await second, "second");
        assert.equal(globalThis.__spaRouterCount, 0);
        assert.equal(globalThis.__spaRouter, false);
    } finally {
        globalThis.__spaRouter = originalRouterFlag;
        globalThis.__spaRouterCount = originalRouterCount;
    }
});

test("mountWhenDirect pagehide listener marks the page as loading", async () => {
    const originalDocument = global.document;
    const originalWindow = global.window;
    const originalRouterFlag = globalThis.__spaRouter;
    const body = createMockBody();
    const root = { id: "app-root" };
    const listeners = new Map();
    global.document = {
        body,
        createElement(tagName) {
            return createMockElement(tagName);
        },
        querySelector() {
            return root;
        },
    };
    global.window = {
        addEventListener(eventName, listener) {
            listeners.set(eventName, [
                ...(listeners.get(eventName) ?? []),
                listener,
            ]);
        },
    };
    globalThis.__spaRouter = false;

    try {
        await mountWhenDirect(async () => {});
        assert.equal(listeners.has("beforeunload"), false);
        assert.ok(
            listeners
                .get("pagehide")
                .every((listener) => typeof listener === "function"),
        );
        body.dataset.pageReady = "true";
        for (const listener of listeners.get("pagehide") ?? []) listener();
        assert.equal(body.dataset.pageReady, "false");
        assert.equal(body.attributes["aria-busy"], "true");
    } finally {
        global.document = originalDocument;
        global.window = originalWindow;
        globalThis.__spaRouter = originalRouterFlag;
    }
});

for (const event of ["cognis:route-will-change", "pagehide"]) {
    test(`direct mount receives the host lifecycle signal and releases on ${event}`, async (context) => {
        const previous = {
            document: globalThis.document,
            window: globalThis.window,
            router: globalThis.__spaRouter,
        };
        context.after(() => {
            globalThis.document = previous.document;
            globalThis.window = previous.window;
            globalThis.__spaRouter = previous.router;
        });
        const target = new EventTarget();
        target.location = { pathname: "/direct", search: "", hash: "" };
        globalThis.window = target;
        const root = {};
        globalThis.document = {
            body: createMockBody(),
            createElement: createMockElement,
            querySelector: () => root,
        };
        globalThis.__spaRouter = false;
        let signal;
        let disposed = 0;
        await mountWhenDirect(async (receivedRoot, options) => {
            assert.equal(receivedRoot, root);
            signal = options.signal;
            signal.addEventListener("abort", () => disposed++, { once: true });
        });
        assert.equal(signal.aborted, false);
        target.dispatchEvent(
            new Event("cognis:route-before-navigate", { cancelable: true }),
        );
        assert.equal(signal.aborted, false);
        target.dispatchEvent(new Event(event));
        target.dispatchEvent(new Event(event));
        assert.equal(signal.aborted, true);
        assert.equal(disposed, 1);
    });
}

test("leaving a pending direct mount releases its loading token immediately", async (context) => {
    const previous = {
        document: globalThis.document,
        window: globalThis.window,
        router: globalThis.__spaRouter,
    };
    context.after(() => {
        globalThis.document = previous.document;
        globalThis.window = previous.window;
        globalThis.__spaRouter = previous.router;
    });
    const target = new EventTarget();
    target.location = { pathname: "/pending", search: "", hash: "" };
    globalThis.window = target;
    const body = createMockBody();
    globalThis.document = {
        body,
        createElement: createMockElement,
        querySelector: () => ({}),
    };
    globalThis.__spaRouter = false;
    let release;
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    const mounting = mountWhenDirect(async () => pending);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(body.dataset.pageReady, "false");
    target.dispatchEvent(new Event("cognis:route-will-change"));
    assert.equal(body.dataset.pageReady, "true");
    release();
    await mounting;
});

test("an already offline direct page cannot mount without current legal access", async (context) => {
    const previous = {
        document: globalThis.document,
        window: globalThis.window,
        router: globalThis.__spaRouter,
        publicRoute: globalThis.__cognisPublicSpaRoute,
    };
    const oldState = uiCtx.capabilities.get("offline:state");
    const oldPolicy = uiCtx.capabilities.get("offline:accessPolicy");
    const offline = { isOffline: () => true };
    let allowed = false;
    const policy = { allows: () => allowed };
    uiCtx.capabilities.remove("offline:state", oldState);
    uiCtx.capabilities.remove("offline:accessPolicy", oldPolicy);
    uiCtx.capabilities.contribute("offline:state", offline);
    uiCtx.capabilities.contribute("offline:accessPolicy", policy);
    context.after(() => {
        uiCtx.capabilities.remove("offline:state", offline);
        uiCtx.capabilities.remove("offline:accessPolicy", policy);
        uiCtx.capabilities.contribute("offline:state", oldState);
        uiCtx.capabilities.contribute("offline:accessPolicy", oldPolicy);
        globalThis.document = previous.document;
        globalThis.window = previous.window;
        globalThis.__spaRouter = previous.router;
        globalThis.__cognisPublicSpaRoute = previous.publicRoute;
    });
    const windowTarget = new EventTarget();
    windowTarget.location = { pathname: "/cached", search: "", hash: "" };
    globalThis.window = windowTarget;
    globalThis.document = {
        body: createMockBody(),
        createElement: createMockElement,
        querySelector: () => ({}),
    };
    globalThis.__spaRouter = false;
    let mounts = 0;
    let blocked = 0;
    windowTarget.addEventListener(
        "cognis:offline-policy-changed",
        () => blocked++,
    );
    await mountWhenDirect(
        async () => {
            mounts++;
        },
        { public: true },
    );
    assert.equal(mounts, 0);
    assert.equal(blocked, 1);
    allowed = true;
    await mountWhenDirect(
        async () => {
            mounts++;
        },
        { public: true },
    );
    assert.equal(mounts, 1);
});
