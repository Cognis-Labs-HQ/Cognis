import test from "node:test";
import assert from "node:assert/strict";

import { beginPageLoading, mountWhenDirect } from "../page-entry.js";

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
    const body = createMockBody();
    global.document = { body };

    try {
        const finishFirstLoad = beginPageLoading();
        const finishSecondLoad = beginPageLoading();
        assert.equal(body.dataset.pageReady, "false");
        assert.equal(body.attributes["aria-busy"], "true");

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
