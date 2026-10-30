import { createTopBanners } from "../../../ui/reuse/top-banners.js";
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
    let clockOffset = 0;
    let loseSetupConnection = false;
    let instance = "instance:learner";
    const { uiCtx } = loadTestModule(
        new URL("../../../ui/reuse/ui-ctx.js", import.meta.url),
        {
            "./flow-contracts.js": { BROWSER_FLOW_CONTRACTS },
            "./offline-runtime.js": { registerOfflineRuntime },
            "./resources.js": { createReuseResources },
            "./top-banners.js": { createTopBanners },
            "./sub-page-registry.js": { createSubPageRegistry },
        },
    );
    const window = new EventTarget();
    window.location = { pathname: "/study/explore", hash: "" };
    const auth = loadTestModule(
        new URL("../ui/session-flow-hooks.js", import.meta.url),
        {
            "./external-profile-sync.js": {},
            "/static/reuse/flow-registry.js": {},
            "/static/gateways/auth/reuse/password-confirmation.js": {},
            "/static/adapters/auth/keyring/keyring.js": {},
            "/static/reuse/ui-ctx.js": { uiCtx },
            "/static/reuse/offline-state.js": { isOffline: () => offline },
            "/static/reuse/api-client.js": {
                apiFetch: async (url) => {
                    calls++;
                    if (
                        loseSetupConnection &&
                        url === "/api/v1/auth/setup-status"
                    ) {
                        offline = true;
                        throw new TypeError("Failed to fetch");
                    }
                    if (offline) throw new TypeError("Failed to fetch");
                    return {
                        ok: status === 200,
                        status,
                        json: async () => ({
                            data: {
                                enabled: true,
                                requiresSetup: false,
                                accountInstanceId: instance,
                            },
                        }),
                    };
                },
            },
        },
        {
            window,
            Date: class extends Date {
                static now() {
                    return Date.now() + clockOffset;
                }
            },
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
        resetSetup: auth.invalidateAuthSetupCache,
        setInstance: (value) => {
            instance = value;
        },
        disconnect: () => {
            offline = true;
        },
        calls: () => calls,
        loseConnectionDuringSetup: () => {
            clockOffset += 6_000;
            loseSetupConnection = true;
        },
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

test("a verified session stays offline when connectivity is lost during its setup refresh", async () => {
    const state = fixture();
    assert.equal((await authenticate(state)).authenticated, true);
    state.loseConnectionDuringSetup();
    assert.equal((await authenticate(state)).authenticated, true);
    assert.equal((await authenticate(state)).authenticated, true);
});

test("Auth exposes offline session validity without network calls and revokes it on expiry, identity changes", async () => {
    const state = fixture();
    const valid = state.uiCtx.capabilities.get("session:isOfflineValid");
    assert.equal(valid(), false);
    await authenticate(state);
    const calls = state.calls();
    assert.equal(valid(), true);
    assert.equal(state.calls(), calls);
    state.values.set("cognis_session_expires_at", "2000-01-01T00:00:00Z");
    assert.equal(valid(), false);
    state.values.set(
        "cognis_session_expires_at",
        new Date(Date.now() + 60_000).toISOString(),
    );
    state.values.set("cognis_access_token", "other-session");
    assert.equal(valid(), false);
});

test("authenticated alternate guest sessions do not fetch normal account setup or run email integrations", async () => {
    const state = fixture();
    state.values.set("cognis_account", "share:resource:guest");
    state.uiCtx.extendFlow(
        "authenticate-session",
        "apply-alternate-auth",
        { id: "guest:fixture" },
        () => ({
            authenticated: true,
            isGuestSession: true,
            accountId: "share:resource:guest",
            role: "user",
        }),
    );
    const session = await authenticate(state);
    assert.equal(session.authenticated, true);
    assert.equal(session.isGuestSession, true);
    assert.equal(state.calls(), 0);
    assert.equal(
        state.uiCtx.capabilities.get("session:isOfflineValid")(),
        false,
    );
});

test("offline identity comes only from server-verified account instances and is replaced on a new login", async () => {
    const state = fixture();
    const identity = state.uiCtx.capabilities.get("session:getOfflineIdentity");
    assert.equal(identity(), null);
    await authenticate(state);
    assert.equal(identity().instance, "instance:learner");
    state.values.set("cognis_account_instance", "unverified-browser-value");
    assert.equal(identity().instance, "instance:learner");
    state.setInstance("recreated-instance");
    state.values.set("cognis_access_token", "replacement-session");
    assert.equal(identity(), null);
    await authenticate(state);
    assert.equal(identity().instance, "recreated-instance");
    state.disconnect();
    assert.equal(identity().instance, "recreated-instance");
    state.values.set("cognis_session_expires_at", "2000-01-01T00:00:00Z");
    assert.equal(identity(), null);
});

test("missing authoritative instance metadata revokes an earlier offline authorization", async () => {
    const state = fixture();
    await authenticate(state);
    state.setInstance(undefined);
    state.resetSetup();
    assert.equal((await authenticate(state)).authenticated, false);
    assert.equal(
        state.uiCtx.capabilities.get("session:getOfflineIdentity")(),
        null,
    );
    state.disconnect();
    await assert.rejects(authenticate(state), /offline_operation_unavailable/);
});
