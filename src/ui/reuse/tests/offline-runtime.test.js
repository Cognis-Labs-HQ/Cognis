import { installTutorials } from "../tutorials/index.js";
import { createTopBanners } from "../top-banners.js";
import { registerOfflineAssets } from "../offline-assets.js";
import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createOfflineOutbox } from "../offline-outbox.js";
import { BROWSER_FLOW_CONTRACTS } from "../flow-contracts.js";
import { createReuseResources } from "../resources.js";
import { createSubPageRegistry } from "../sub-page-registry.js";

function fixture({ browser = false } = {}) {
    const window = new EventTarget();
    const values = new Map([
        ["cognis_account", "learner"],
        ["cognis_access_token", "fixture-session"],
    ]);
    const storage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
    };
    let disconnected = true;
    let consented = true;
    const runtime = loadTestModule(
        new URL("../offline-runtime.js", import.meta.url),
        {
            "./offline-assets.js": { registerOfflineAssets },
            "./offline-policy.js": {
                offlinePolicy: { allows: () => consented },
            },
            "./offline-outbox.js": {
                createOfflineOutbox: (options) =>
                    createOfflineOutbox({
                        ...options,
                        storage: () => storage,
                        withLock: (operation) =>
                            Promise.resolve().then(operation),
                        withDeliveryLock: (operation) =>
                            Promise.resolve().then(operation),
                        log: () => {},
                    }),
            },
            "./offline-state.js": {
                isOffline: () => disconnected,
                offlineEnabled: () => true,
                offlineWorkerRequest: async () => [],
            },
        },
        {
            localStorage: storage,
            console,
            ...(browser
                ? {
                      window,
                      queueMicrotask,
                      CustomEvent,
                      setTimeout,
                      clearTimeout,
                  }
                : {}),
        },
    );
    const { uiCtx } = loadTestModule(new URL("../ui-ctx.js", import.meta.url), {
        "./tutorials/index.js": { installTutorials },
        "./offline-runtime.js": runtime,
        "./flow-contracts.js": { BROWSER_FLOW_CONTRACTS },
        "./resources.js": { createReuseResources },
        "./top-banners.js": { createTopBanners },
        "./sub-page-registry.js": { createSubPageRegistry },
    });
    uiCtx.capabilities.contribute("session:isOfflineValid", () => true);
    uiCtx.capabilities.contribute("session:getOfflineIdentity", () => ({
        account: values.get("cognis_account"),
        session: values.get("cognis_access_token"),
        instance: "instance:learner",
    }));
    return {
        uiCtx,
        values,
        window,
        reconnect: () => {
            disconnected = false;
        },
        consent: (value) => {
            consented = value;
        },
    };
}

test("queued writes require successful registered session authorization and current consent before replay", async () => {
    const state = fixture();
    const outbox = state.uiCtx.capabilities.get("offline:outbox");
    const controller = new AbortController();
    const delivered = [];
    outbox.register(
        "practice",
        async (payload) => delivered.push(payload),
        controller.signal,
    );
    await outbox.submit("practice", "attempt", { grade: "good" });
    state.reconnect();
    assert.equal((await outbox.flush()).sent, 0);
    assert.equal(delivered.length, 0);
    state.uiCtx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "auth:fixture" },
        () => ({ authenticated: true }),
    );
    state.consent(false);
    await state.uiCtx.runFlow("authenticate-session", {});
    assert.equal(delivered.length, 0);
    state.consent(true);
    await state.uiCtx.runFlow("authenticate-session", {});
    await outbox.flush();
    assert.deepEqual(delivered, [{ grade: "good" }]);
    await outbox.submit("practice", "second", { grade: "again" });
    state.uiCtx.extendFlow(
        "authenticate-session",
        "enforce-setup-requirements",
        { id: "legal:failedRefresh" },
        () => {
            throw new Error("consent_refresh_unavailable");
        },
    );
    await assert.rejects(
        state.uiCtx.runFlow("authenticate-session", {}),
        /consent_refresh_unavailable/,
    );
    assert.equal((await outbox.flush()).sent, 0);
    assert.equal(delivered.length, 1);
    state.values.set("cognis_account", "other");
    assert.equal((await outbox.flush()).sent, 0);
    controller.abort();
});

test("browser close warns for buffered changes, including disabled owners, and clears after delivery", async () => {
    const state = fixture({ browser: true });
    const outbox = state.uiCtx.capabilities.get("offline:outbox");
    const warning = () => {
        const event = new Event("beforeunload", { cancelable: true });
        state.window.dispatchEvent(event);
        return event.defaultPrevented;
    };
    assert.equal(warning(), false);
    const controller = new AbortController();
    outbox.register("messages", async () => {}, controller.signal);
    await outbox.submit("messages", "message", { ciphertext: "encrypted" });
    assert.equal(warning(), true);
    controller.abort();
    assert.equal(warning(), true);
    state.values.set("cognis_account", "other");
    assert.equal(warning(), false);
    state.values.set("cognis_account", "learner");
    assert.equal(warning(), true);
    const mounted = new AbortController();
    outbox.register("messages", async () => {}, mounted.signal);
    state.reconnect();
    state.uiCtx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "auth:online" },
        () => ({ authenticated: true }),
    );
    await state.uiCtx.runFlow("authenticate-session", {});
    await outbox.flush();
    assert.equal(warning(), false);
    mounted.abort();
});

test("session completion does not wait for a slow queued delivery", async () => {
    const state = fixture();
    const outbox = state.uiCtx.capabilities.get("offline:outbox");
    const controller = new AbortController();
    let release;
    const response = new Promise((resolve) => {
        release = resolve;
    });
    outbox.register("practice", () => response, controller.signal);
    await outbox.submit("practice", "slow", {});
    state.reconnect();
    state.uiCtx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "auth:slowDelivery" },
        () => ({ authenticated: true }),
    );
    let completed = false;
    const authentication = state.uiCtx
        .runFlow("authenticate-session", {})
        .then(() => {
            completed = true;
        });
    await new Promise((resolve) => setImmediate(resolve));
    try {
        assert.equal(
            completed,
            true,
            "queued writes must not hold session completion open",
        );
        assert.equal(outbox.hasBufferedChanges(), true);
    } finally {
        release();
        await authentication;
        await outbox.flush();
        controller.abort();
    }
    assert.equal(outbox.hasBufferedChanges(), false);
});

test("an unauthenticated login page does not warn about a previous account's buffer", async () => {
    const state = fixture({ browser: true });
    const outbox = state.uiCtx.capabilities.get("offline:outbox");
    const controller = new AbortController();
    outbox.register("practice", async () => {}, controller.signal);
    await outbox.submit("practice", "one", {});
    state.values.delete("cognis_access_token");
    const event = new Event("beforeunload", { cancelable: true });
    state.window.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
    assert.equal(
        JSON.parse(state.values.get("cognis_offline_outbox")).length,
        1,
    );
    controller.abort();
});

test("connectivity recovery reauthorizes and attempts queued delivery, while consent still blocks replay", async () => {
    const state = fixture({ browser: true });
    const outbox = state.uiCtx.capabilities.get("offline:outbox");
    const controller = new AbortController();
    let sent = 0;
    outbox.register(
        "messages",
        async () => {
            sent++;
        },
        controller.signal,
    );
    await outbox.submit("messages", "message", { ciphertext: "encrypted" });
    state.uiCtx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "auth:recheck" },
        () => ({ authenticated: true }),
    );
    const recover = async () => {
        const tasks = [];
        state.window.dispatchEvent(
            new CustomEvent("cognis:connection-restoring", {
                detail: { waitUntil: (task) => tasks.push(task) },
            }),
        );
        await Promise.all(tasks);
    };
    state.reconnect();
    state.consent(false);
    await recover();
    assert.equal(sent, 0);
    assert.equal(outbox.hasBufferedChanges(), true);
    state.consent(true);
    await recover();
    assert.equal(sent, 1);
    assert.equal(outbox.hasBufferedChanges(), false);
    controller.abort();
});

test("enqueue checks the current Auth capability, fails closed if missing and rechecks after storage lock waits", async () => {
    const state = fixture();
    const outbox = state.uiCtx.capabilities.get("offline:outbox");
    const controller = new AbortController();
    outbox.register("practice", async () => {}, controller.signal);
    const original = state.uiCtx.capabilities.get("session:isOfflineValid");
    state.uiCtx.capabilities.remove("session:isOfflineValid", original);
    await assert.rejects(
        outbox.submit("practice", "unverified", {}),
        /offline_delivery_unavailable/,
    );
    let valid = true;
    state.uiCtx.capabilities.contribute("session:isOfflineValid", () => valid);
    await outbox.submit("practice", "verified", {});
    const waiting = outbox.submit("practice", "expired-during-lock", {});
    valid = false;
    await assert.rejects(waiting, /offline_delivery_unavailable/);
    assert.equal((await outbox.pending("practice")).length, 1);
    controller.abort();
});
