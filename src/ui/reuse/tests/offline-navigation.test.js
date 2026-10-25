import { escapeHtml } from "../escape-html.js";
import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { uiCtx } from "../ui-ctx.js";

let offline = true;
let consented = true;
let stallWorker = false;
let autoRefreshes = 0;
const popups = [];
const workerRequests = [];
const navigation = loadTestModule(
    new URL("../offline-navigation.js", import.meta.url),
    {
        "./ui-ctx.js": { uiCtx },
        "./escape-html.js": { escapeHtml },
        "./offline-policy.js": { offlinePolicy: { allows: () => consented } },
        "./offline-state.js": {
            isOffline: () => offline,
            enableOfflineAutoRefresh: () => autoRefreshes++,
            offlineWorkerRequest: async (type) => {
                workerRequests.push(type);
                if (stallWorker) await new Promise(() => {});
            },
        },
        "./i18n.js": {
            createI18n: async () => ({ t: () => "Unavailable offline" }),
        },
        "./popup.js": { openPopup: async (popup) => popups.push(popup) },
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

test("unavailable offline navigation tries the previous view before arming automatic refresh", async () => {
    let attempts = 0;
    const start = autoRefreshes;
    assert.equal(
        await navigation.recoverOfflineNavigation({
            restore: async () => {
                attempts++;
                return true;
            },
        }),
        true,
    );
    assert.equal(attempts, 1);
    assert.equal(autoRefreshes, start);
    assert.equal(
        await navigation.recoverOfflineNavigation({
            restore: async () => false,
        }),
        false,
    );
    assert.equal(autoRefreshes, start + 1);
    assert.equal(
        await navigation.recoverOfflineNavigation({
            restore: async () => {
                throw new Error("cached_page_unavailable");
            },
        }),
        false,
    );
    assert.equal(autoRefreshes, start + 2);
    assert.equal(popups.at(-1).actions[0].id, "back");
});

test("loss of connectivity uses quiet recovery and renders a fallback only when restoration fails", async () => {
    const count = popups.length;
    const refreshes = autoRefreshes;
    let fallbacks = 0;
    for (const restored of [true, false]) {
        assert.equal(
            await navigation.recoverOfflineNavigation({
                notify: false,
                restore: async () => restored,
                fallback: async () => fallbacks++,
            }),
            restored,
        );
    }
    assert.equal(popups.length, count);
    assert.equal(fallbacks, 1);
    assert.equal(autoRefreshes, refreshes + 1);
});

test("explicit private session routes remain available, while consent still gates them", async () => {
    offline = true;
    const route = { id: "core.dashboard", offline: { session: true } };
    assert.equal(await navigation.allowOfflineRoute(route, "/dashboard"), true);
    consented = false;
    assert.equal(
        await navigation.allowOfflineRoute(route, "/dashboard"),
        false,
    );
    consented = true;
});
