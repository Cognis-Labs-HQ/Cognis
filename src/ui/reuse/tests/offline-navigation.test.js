import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { uiCtx } from "../ui-ctx.js";

let offline = true;
let stallWorker = false;
const popups = [];
const workerRequests = [];
const navigation = loadTestModule(
    new URL("../offline-navigation.js", import.meta.url),
    {
        "./ui-ctx.js": { uiCtx },
        "./offline-policy.js": { offlinePolicy: { allows: () => true } },
        "./offline-state.js": {
            isOffline: () => offline,
            offlineWorkerRequest: async (type) => {
                workerRequests.push(type);
                if (stallWorker) await new Promise(() => {});
            },
        },
        "./i18n.js": {
            createI18n: async () => ({ t: () => "Unavailable offline" }),
        },
        "./runtime-error-popup.js": {
            openRuntimeErrorPopup: async (popup) => popups.push(popup),
        },
    },
);

test("the registered offline navigation flow requires public opt-in and available assets", async () => {
    assert.equal(
        await navigation.allowOfflineRoute(
            { public: true, offline: {}, offlineAvailable: true },
            "/public",
        ),
        true,
    );
    for (const route of [
        null,
        { public: false, offline: {}, offlineAvailable: true },
        { public: true },
        { public: true, offline: {}, offlineAvailable: false },
    ]) {
        assert.equal(
            await navigation.allowOfflineRoute(route, "/unavailable"),
            false,
        );
    }
    assert.equal(popups.length, 0);
    offline = false;
    assert.equal(
        await navigation.allowOfflineRoute({ public: false }, "/private"),
        true,
    );
    assert.equal(popups.length, 0);
});

test("canceled offline navigations cannot open an obsolete popup", async () => {
    const controller = new AbortController();
    controller.abort();
    const count = popups.length;
    assert.equal(
        await navigation.allowOfflineRoute(null, "/private", controller.signal),
        false,
    );
    assert.equal(popups.length, count);
});

test("account lifecycle flows invalidate the offline module catalog", async () => {
    await uiCtx.runFlow("logout", {});
    await uiCtx.runFlow("complete-login", {});
    assert.deepEqual(workerRequests, [
        "COGNIS_INVALIDATE_OFFLINE_ROUTES",
        "COGNIS_INVALIDATE_OFFLINE_ROUTES",
        "COGNIS_REFRESH_OFFLINE_ROUTES",
    ]);
});

test("session route registrations permit warm private navigation only during the owning provider lifetime", async () => {
    const controller = new AbortController();
    const register = uiCtx.capabilities.get("offline:registerSessionRoutes");
    register(["owned.page"], controller.signal);
    offline = true;
    assert.equal(
        await navigation.allowOfflineRoute({ id: "owned.page" }, "/owned"),
        true,
    );
    assert.equal(
        await navigation.allowOfflineRoute({ id: "other.page" }, "/other"),
        false,
    );
    controller.abort();
    assert.equal(
        await navigation.allowOfflineRoute({ id: "owned.page" }, "/owned"),
        false,
    );
});

test("login completion does not wait for an unresponsive worker", async () => {
    offline = false;
    stallWorker = true;
    try {
        const result = await uiCtx.runFlow("complete-login", {});
        assert.equal(
            result.stageResults["setup-account-services"].find(
                (item) => item?.scheduled,
            )?.scheduled,
            true,
        );
    } finally {
        stallWorker = false;
    }
});
