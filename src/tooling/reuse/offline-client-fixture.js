import { webcrypto } from "node:crypto";
import { createOfflineOutbox } from "../../ui/reuse/offline-outbox.js";
import { registerScopedUiActions } from "../../ui/reuse/scoped-actions.js";
import { uiCtx } from "../../ui/reuse/ui-ctx.js";
import { loadTestModule } from "./test-module.ts";

/** Exercise component clients against the public host delivery/cache contracts. */
export function createOfflineClientFixture(send) {
    let disconnected = false;
    let actor = { account: "learner", session: "fixture-token" };
    const values = new Map();
    const capabilities = new Map();
    const controller = new AbortController();
    const state = {
        isOffline: () => disconnected,
        offlineEnabled: () => true,
        offlineCacheGeneration: () => 0,
    };
    const outbox = createOfflineOutbox({
        identity: () => actor,
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
        registerFlow(id, stages) {
            const dispose = uiCtx.registerFlow(id, stages);
            controller.signal.addEventListener("abort", dispose, {
                once: true,
            });
            return dispose;
        },
        extendFlow(id, stage, hook, handler) {
            const added = uiCtx.extendFlow(id, stage, hook, handler);
            if (added)
                controller.signal.addEventListener(
                    "abort",
                    () => uiCtx.removeFlowHook(id, stage, hook.id),
                    { once: true },
                );
            return added;
        },
        runFlow: uiCtx.runFlow,
        removeFlowHook: uiCtx.removeFlowHook,
        capabilities: {
            get: (id) => capabilities.get(id) ?? uiCtx.capabilities.get(id),
            contribute(id, value) {
                if (capabilities.has(id)) return false;
                capabilities.set(id, value);
                return true;
            },
            remove(id, value) {
                return (
                    capabilities.get(id) === value && capabilities.delete(id)
                );
            },
        },
    };
    const dependency = {
        "./offline-state.js": state,
        "./offline-policy.js": { offlinePolicy: { allows: () => true } },
    };
    const globals = {
        crypto: webcrypto,
        AbortSignal,
        console,
        structuredClone,
        Response,
        Headers,
        Blob,
        Uint8Array,
        atob,
        btoa,
        localStorage: {
            getItem: (key) =>
                key === "cognis_account"
                    ? actor.account
                    : key === "cognis_access_token"
                      ? actor.session
                      : null,
        },
    };
    const guard = loadTestModule(
        new URL("../../ui/reuse/offline-identity.js", import.meta.url),
        {},
        globals,
    );
    dependency["./offline-identity.js"] = guard;
    const delivery = loadTestModule(
        new URL("../../ui/reuse/offline-delivery.js", import.meta.url),
        dependency,
        globals,
    );
    const cache = loadTestModule(
        new URL("../../ui/reuse/offline-read-cache.js", import.meta.url),
        dependency,
        globals,
    );
    const http = loadTestModule(
        new URL("../../ui/reuse/offline-http-client.js", import.meta.url),
        {
            "./offline-read-cache.js": cache,
            "./offline-delivery.js": delivery,
            "./scoped-actions.js": { registerScopedUiActions },
            "./offline-state.js": state,
            "./offline-identity.js": guard,
        },
        globals,
    );
    return {
        values,
        changeAccount: (account, session = "new-token") => {
            actor = { account, session };
        },
        controller,
        ctx,
        outbox,
        imports: {
            "/static/reuse/offline-http-client.js": http,
            "/static/reuse/ui-ctx.js": { uiCtx: ctx },
            "/static/reuse/api-client.js": { apiFetch: send },
            "/static/reuse/offline-state.js": state,
            "/static/reuse/offline-delivery.js": delivery,
            "/static/reuse/offline-read-cache.js": cache,
        },
        globals,
        disconnect: () => {
            disconnected = true;
        },
        reconnect: () => {
            disconnected = false;
        },
    };
}
