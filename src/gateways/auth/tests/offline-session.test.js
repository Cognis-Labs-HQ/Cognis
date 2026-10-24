import { registerOfflineRuntime } from "../../../ui/reuse/offline-runtime.js";
import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { BROWSER_FLOW_CONTRACTS } from "../../../ui/reuse/flow-contracts.js";
import { createReuseResources } from "../../../ui/reuse/resources.js";
import { createSubPageRegistry } from "../../../ui/reuse/sub-page-registry.js";

function fixture() {
    const values = new Map([
        ["cognis_account", "learner"],
        ["cognis_access_token", "verified-token"],
        [
            "cognis_session_expires_at",
            new Date(Date.now() + 60_000).toISOString(),
        ],
    ]);
    let offline = false;
    let calls = 0;
    let status = 200;
    const { uiCtx } = loadTestModule(
        new URL("../../../ui/reuse/ui-ctx.js", import.meta.url),
        {
            "./flow-contracts.js": { BROWSER_FLOW_CONTRACTS },
            "./offline-runtime.js": { registerOfflineRuntime },
            "./resources.js": { createReuseResources },
            "./sub-page-registry.js": { createSubPageRegistry },
        },
    );
    const window = new EventTarget();
    window.location = { pathname: "/study/explore", hash: "" };
    loadTestModule(
        new URL("../ui/session-flow-hooks.js", import.meta.url),
        {
            "./external-profile-sync.js": {},
            "/static/reuse/flow-registry.js": {},
            "/static/gateways/auth/reuse/password-confirmation.js": {},
            "/static/adapters/auth/keyring/keyring.js": {},
            "/static/reuse/ui-ctx.js": { uiCtx },
            "/static/reuse/offline-state.js": { isOffline: () => offline },
            "/static/reuse/api-client.js": {
                apiFetch: async () => {
                    calls++;
                    if (offline) throw new TypeError("Failed to fetch");
                    return {
                        ok: status === 200,
                        status,
                        json: async () => ({
                            data: { enabled: true, requiresSetup: false },
                        }),
                    };
                },
            },
        },
        {
            window,
            document: { cookie: "" },
            console,
            localStorage: {
                getItem: (key) => values.get(key) ?? null,
                removeItem: (key) => values.delete(key),
            },
        },
    );
    return {
        uiCtx,
        values,
        disconnect: () => {
            offline = true;
        },
        calls: () => calls,
        deny: () => {
            status = 401;
        },
    };
}

async function authenticate(state) {
    return (await state.uiCtx.runFlow("authenticate-session", {})).stageResults[
        "resolve-session"
    ][0];
}

test("a verified tab keeps its session offline without network requests", async () => {
    const state = fixture();
    assert.equal((await authenticate(state)).authenticated, true);
    const requests = state.calls();
    state.disconnect();
    assert.equal((await authenticate(state)).authenticated, true);
    assert.equal(state.calls(), requests);
});

test("stored tokens alone, changed accounts, expired sessions and server denials cannot authorize offline use", async () => {
    const cold = fixture();
    cold.disconnect();
    await assert.rejects(authenticate(cold), /offline_operation_unavailable/);
    for (const invalidate of [
        (state) => state.values.set("cognis_account", "another"),
        (state) => state.values.set("cognis_access_token", "unverified"),
        (state) =>
            state.values.set(
                "cognis_session_expires_at",
                "2000-01-01T00:00:00Z",
            ),
        async (state) => {
            state.deny();
            await authenticate(state);
        },
    ]) {
        const state = fixture();
        assert.equal((await authenticate(state)).authenticated, true);
        await invalidate(state);
        state.disconnect();
        await assert.rejects(
            authenticate(state),
            /offline_operation_unavailable/,
        );
    }
});
