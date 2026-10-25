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
        "./offline-runtime.js": runtime,
        "./flow-contracts.js": { BROWSER_FLOW_CONTRACTS },
        "./resources.js": { createReuseResources },
        "./sub-page-registry.js": { createSubPageRegistry },
    });
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
    assert.equal(warning(), false);
    mounted.abort();
});
