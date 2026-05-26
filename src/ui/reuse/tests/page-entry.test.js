import test from "node:test";
import assert from "node:assert/strict";

import { beginPageLoading, mountWhenDirect } from "../page-entry.js";

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
        const showMessageCallback = [...timeoutEntries.values()].find(
            ({ delay }) => delay === 500,
        )?.callback;
        showMessageCallback?.();
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

test("mountWhenDirect refresh listeners mark the page as loading", async () => {
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
            listeners.set(eventName, listener);
        },
    };
    globalThis.__spaRouter = false;

    try {
        await mountWhenDirect(async () => {});
        body.dataset.pageReady = "true";
        listeners.get("beforeunload")?.();
        assert.equal(body.dataset.pageReady, "false");
        assert.equal(body.attributes["aria-busy"], "true");
    } finally {
        global.document = originalDocument;
        global.window = originalWindow;
        globalThis.__spaRouter = originalRouterFlag;
    }
});
