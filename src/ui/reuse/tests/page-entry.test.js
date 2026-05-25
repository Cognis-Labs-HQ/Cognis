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
        append(...nodes) {
            this.children.push(...nodes);
        },
    };
}

test("page loading helpers keep the page busy until all pending loads finish", () => {
    const originalDocument = global.document;
    const body = createMockBody();
    global.document = {
        body,
        createElement(tagName) {
            return createMockElement(tagName);
        },
    };

    try {
        const finishFirstLoad = beginPageLoading();
        const finishSecondLoad = beginPageLoading();
        assert.equal(body.dataset.pageReady, "false");
        assert.equal(body.attributes["aria-busy"], "true");
        assert.equal(body.dataset.pageLoadingOverlayMounted, "true");
        assert.ok(body.children.length >= 1);

        finishFirstLoad();
        assert.equal(body.dataset.pageReady, "false");
        assert.equal(body.attributes["aria-busy"], "true");

        finishSecondLoad();
        assert.equal(body.dataset.pageReady, "true");
        assert.equal(body.attributes["aria-busy"], "false");
    } finally {
        global.document = originalDocument;
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
