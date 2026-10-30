import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

import { COMMON_STYLESHEETS, createReuseResources } from "../resources.js";
import { uiCtx } from "../ui-ctx.js";

test("reuse resources resolve and load host modules through ctx", async () => {
    const imported = [];
    const loaded = [];
    const reuse = createReuseResources({
        importModule: async (url) => {
            imported.push(url);
            return { url };
        },
        loadStylesheet: async (url) => loaded.push(url),
    });

    assert.equal(
        reuse.moduleUrl("page-composer/index.js"),
        "/static/reuse/page-composer/index.js",
    );
    assert.equal(
        reuse.stylesheetUrl("floating-window.css"),
        "/static/styles/reuse/floating-window.css",
    );
    assert.deepEqual(await reuse.importModule("escape-html.js"), {
        url: "/static/reuse/escape-html.js",
    });
    await reuse.loadStylesheets(["layout.css", "page-sections.css"]);
    assert.deepEqual(imported, ["/static/reuse/escape-html.js"]);
    assert.deepEqual(loaded, [
        "/static/styles/reuse/layout.css",
        "/static/styles/reuse/page-sections.css",
    ]);
    assert.equal(
        uiCtx.capabilities.get("ui:reuse").moduleUrl("popup.js"),
        "/static/reuse/popup.js",
    );
});

test("reuse resources reject traversal and non-reuse asset types", () => {
    const reuse = createReuseResources();
    for (const invalidPath of [
        "../api-client.js",
        "/api-client.js",
        "tests/api-client.test.js",
        "api-client.test.js",
        "api-client.css",
        "api-client.js?version=1",
    ]) {
        assert.throws(
            () => reuse.moduleUrl(invalidPath),
            /invalid_reuse_resource_path/,
        );
    }
});

test("the ctx common stylesheet catalog covers every reuse stylesheet", () => {
    const stylesheetDirectory = new URL("../../styles/reuse/", import.meta.url);
    const stylesheets = readdirSync(stylesheetDirectory)
        .filter((fileName) => fileName.endsWith(".css"))
        .sort();
    assert.deepEqual([...COMMON_STYLESHEETS].sort(), stylesheets);
});
