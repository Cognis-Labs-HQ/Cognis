import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { uiCtx } from "../ui-ctx.js";

let offline = false;
let leases = 0;
const events = [];
const { prepareOfflineRouteAssets } = loadTestModule(
    new URL("../offline-route-assets.js", import.meta.url),
    {
        "./ui-ctx.js": { uiCtx },
        "./offline-state.js": {
            isOffline: () => offline,
            offlineEnabled: () => true,
        },
        "./page-entry.js": { loadWithSpaImportGuard: (load) => load() },
        "./page-styles.js": {
            preparePageStylesheets: async () => {
                leases++;
                return { cancel: () => leases-- };
            },
        },
    },
    {
        console,
        window: { dispatchEvent: (event) => events.push(event.type) },
        CustomEvent,
        Promise,
        WeakSet,
    },
);

test("offline route preparation runs through its flow, caches successful imports and releases inactive styles", async () => {
    let imports = 0;
    let failed = true;
    const route = {
        id: "cached",
        load: async () => {
            imports++;
        },
    };
    const retry = {
        id: "retry",
        load: async () => {
            if (failed) throw new TypeError("network unavailable");
        },
    };
    const ready = uiCtx.capabilities.get("offline:areRouteAssetsReady");
    assert.equal(ready(route), false);
    await uiCtx.runFlow("offline:prepareRouteAssets", {
        routes: [route, retry],
    });
    assert.equal(ready(route), true);
    assert.equal(ready(retry), false);
    assert.equal(leases, 0);
    failed = false;
    await uiCtx.runFlow("offline:prepareRouteAssets", {
        routes: [route, retry],
    });
    assert.equal(imports, 1);
    assert.equal(ready(retry), true);
    assert.ok(events.includes("cognis:offline-routes-prepared"));
    offline = true;
    prepareOfflineRouteAssets([
        { load: () => assert.fail("No offline prefetch") },
    ]);
    assert.equal(leases, 0);
});

test("a separately loaded utility reuses the existing ctx flow and cache capabilities", async () => {
    const ready = uiCtx.capabilities.get("offline:areRouteAssetsReady");
    const duplicate = loadTestModule(
        new URL("../offline-route-assets.js", import.meta.url),
        {
            "./ui-ctx.js": { uiCtx },
            "./offline-state.js": {
                isOffline: () => false,
                offlineEnabled: () => true,
            },
            "./page-entry.js": {
                loadWithSpaImportGuard: () =>
                    assert.fail("duplicate hooks must not run"),
            },
            "./page-styles.js": {
                preparePageStylesheets: () =>
                    assert.fail("duplicate hooks must not run"),
            },
        },
        { console, window: { dispatchEvent: () => {} }, CustomEvent },
    );
    assert.equal(uiCtx.capabilities.get("offline:areRouteAssetsReady"), ready);
    let imports = 0;
    const route = {
        id: "external-module",
        load: async () => {
            imports++;
        },
    };
    offline = false;
    duplicate.prepareOfflineRouteAssets([route]);
    await new Promise(setImmediate);
    assert.equal(imports, 1);
    assert.equal(ready(route), true);
});

test("prepared descriptors remain usable across loaders but a changed script requires preparation", async () => {
    offline = false;
    const route = {
        id: "messages",
        scriptUrl: "/assets/messages-ABCDEFGH.js",
        stylesheets: ["/assets/messages-ABCDEFGH.css"],
        load: async () => {},
    };
    await uiCtx.runFlow("offline:prepareRouteAssets", { routes: [route] });
    const ready = uiCtx.capabilities.get("offline:areRouteAssetsReady");
    assert.equal(ready({ ...route }), true);
    assert.equal(
        ready({ ...route, scriptUrl: "/assets/messages-12345678.js" }),
        false,
    );
    assert.equal(
        ready({
            ...route,
            capabilityScripts: ["/assets/provider-ABCDEFGH.js"],
        }),
        false,
    );
});
