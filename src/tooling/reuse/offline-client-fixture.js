import { webcrypto } from "node:crypto";
import { createOfflineOutbox } from "../../ui/reuse/offline-outbox.js";
import { uiCtx } from "../../ui/reuse/ui-ctx.js";
import { loadTestModule } from "./test-module.ts";

/** Exercise component clients against the public host delivery/cache contracts. */
export function createOfflineClientFixture(send) {
    let disconnected = false;
    const values = new Map();
    const capabilities = new Map();
    const controller = new AbortController();
    const state = {
        isOffline: () => disconnected,
        offlineEnabled: () => true,
        offlineCacheGeneration: () => 0,
    };
    const outbox = createOfflineOutbox({
        identity: () => ({ account: "learner", session: "fixture-token" }),
        enabled: () => true,
        offline: state.isOffline,
        allowed: () => true,
        storage: () => ({
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, value),
        }),
        withLock: (operation) => Promise.resolve().then(operation),
        log: () => {},
    });
    capabilities.set("offline:outbox", outbox);
    capabilities.set("offline:state", state);
    const ctx = {
        signal: controller.signal,
        runFlow: uiCtx.runFlow,
        capabilities: {
            get: (id) => capabilities.get(id) ?? uiCtx.capabilities.get(id),
            contribute: (id, value) => capabilities.set(id, value),
        },
    };
    const dependency = {
        "./offline-state.js": state,
        "./offline-policy.js": { offlinePolicy: { allows: () => true } },
    };
    return {
        controller,
        ctx,
        outbox,
        imports: {
            "/static/reuse/ui-ctx.js": { uiCtx: ctx },
            "/static/reuse/api-client.js": { apiFetch: send },
            "/static/reuse/offline-state.js": state,
            "/static/reuse/offline-delivery.js": loadTestModule(
                new URL("../../ui/reuse/offline-delivery.js", import.meta.url),
                dependency,
            ),
            "/static/reuse/offline-read-cache.js": loadTestModule(
                new URL(
                    "../../ui/reuse/offline-read-cache.js",
                    import.meta.url,
                ),
                dependency,
            ),
        },
        globals: { crypto: webcrypto, AbortSignal, console, structuredClone },
        disconnect: () => {
            disconnected = true;
        },
        reconnect: () => {
            disconnected = false;
        },
    };
}
