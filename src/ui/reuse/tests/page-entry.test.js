import test from "node:test";
import assert from "node:assert/strict";

import {
    beginPageLoading,
    endPageLoading,
    mountWhenDirect,
} from "../page-entry.js";

function createMockBody() {
    return {
        dataset: {},
        attributes: {},
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
    };
}

test("page loading helpers keep the page busy until all pending loads finish", () => {
    const originalDocument = global.document;
    const originalCount = globalThis.__pageLoadingCount;
    const body = createMockBody();
    global.document = { body };
    globalThis.__pageLoadingCount = 0;

    beginPageLoading();
    beginPageLoading();
    assert.equal(body.dataset.pageReady, "false");
    assert.equal(body.attributes["aria-busy"], "true");

    endPageLoading();
    assert.equal(body.dataset.pageReady, "false");
    assert.equal(body.attributes["aria-busy"], "true");

    endPageLoading();
    assert.equal(body.dataset.pageReady, "true");
    assert.equal(body.attributes["aria-busy"], "false");

    global.document = originalDocument;
    globalThis.__pageLoadingCount = originalCount;
});

test("mountWhenDirect wraps direct mounts with the shared loading state", async () => {
    const originalDocument = global.document;
    const originalRouterFlag = globalThis.__spaRouter;
    const originalCount = globalThis.__pageLoadingCount;
    const body = createMockBody();
    const root = { id: "app-root" };
    let receivedRoot = null;
    global.document = {
        body,
        querySelector(selector) {
            assert.equal(selector, "#app");
            return root;
        },
    };
    globalThis.__spaRouter = false;
    globalThis.__pageLoadingCount = 0;

    await mountWhenDirect(async (resolvedRoot) => {
        receivedRoot = resolvedRoot;
        assert.equal(body.dataset.pageReady, "false");
        assert.equal(body.attributes["aria-busy"], "true");
    });

    assert.equal(receivedRoot, root);
    assert.equal(body.dataset.pageReady, "true");
    assert.equal(body.attributes["aria-busy"], "false");

    global.document = originalDocument;
    globalThis.__spaRouter = originalRouterFlag;
    globalThis.__pageLoadingCount = originalCount;
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
