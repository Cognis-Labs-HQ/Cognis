import { registerFloatingMenus } from "../../../ui/reuse/floating-menu-queue.js";
import { installPageReadiness } from "../../../ui/reuse/page-readiness.js";
import { installTutorials } from "../../../ui/reuse/tutorials/index.js";
import { createTopBanners } from "../../../ui/reuse/top-banners.js";
import { registerOfflineRuntime } from "../../../ui/reuse/offline-runtime.js";
import test from "node:test";
import { createSessionIdentityClient } from "../ui/session-identity.js";
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
    const pendingRequests = [];
    let offline = false;
    let calls = 0;
    let status = 200;
    let purpose = "session";
    let clockOffset = 0;
    let loseSetupConnection = false;
    let instance = "instance:learner";
    const { uiCtx } = loadTestModule(
        new URL("../../../ui/reuse/ui-ctx.js", import.meta.url),
        {
            "./flow-contracts.js": { BROWSER_FLOW_CONTRACTS },
            "./tutorials/index.js": { installTutorials },
            "./page-readiness.js": { installPageReadiness },
            "./floating-menu-queue.js": { registerFloatingMenus },
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
            "./session-identity.js": { createSessionIdentityClient },
            "/static/reuse/flow-registry.js": {},
            "/static/gateways/auth/reuse/password-confirmation.js": {},
            "/static/adapters/auth/keyring/keyring.js": {},
            "/static/reuse/ui-ctx.js": { uiCtx },
            "/static/reuse/offline-state.js": { isOffline: () => offline },
            "/static/reuse/api-client.js": {
                apiFetch: async (url) => {
                    calls++;
                    const pendingIndex = pendingRequests.findIndex(
                        (entry) => entry.url === url,
                    );
                    if (pendingIndex !== -1) {
                        const [pending] = pendingRequests.splice(
                            pendingIndex,
                            1,
                        );
                        pending.entered.resolve();
                        return pending.response.promise;
                    }
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
                                sub: values.get("cognis_account"),
                                purpose,
                                role: "user",
                                providerId: "local",
                                setupPending: false,
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
        deferRequest(url) {
            const entered = Promise.withResolvers();
            const response = Promise.withResolvers();
            pendingRequests.push({ url, entered, response });
            return { entered: entered.promise, ...response };
        },
        resetSetup: auth.invalidateAuthSetupCache,
        setPurpose: (value) => {
            purpose = value;
        },
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
    state.setPurpose("share");
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
    assert.equal(state.calls(), 1);
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

test("verified prefixed accounts ignore forged guest provider and role markers", async () => {
    const state = fixture();
    state.values.set("cognis_account", "share:ordinary");
    state.values.set("cognis_provider_id", "share");
    state.values.set("cognis_role", "guest");
    assert.equal(
        state.uiCtx.capabilities.get("session:isAuthenticated")(),
        false,
    );
    const session = await authenticate(state);
    assert.equal(session.authenticated, true);
    assert.equal(session.accountId, "share:ordinary");
    assert.equal(session.role, "user");
    assert.equal(state.uiCtx.capabilities.get("session:isGuest")(), false);
    assert.equal(
        state.uiCtx.capabilities.get("session:isAuthenticated")(),
        true,
    );
});

for (const status of [401, 403, 404]) {
    test(`a deferred account ${status} cannot clear a newer validated session`, async () => {
        const state = fixture();
        const deferred = state.deferRequest("/api/v1/users/learner/info");
        const older = authenticate(state);
        await deferred.entered;
        state.values.set("cognis_access_token", "new-token");
        state.values.set("cognis_account", "new-account");
        assert.equal((await authenticate(state)).authenticated, true);
        deferred.resolve({ ok: false, status });
        assert.equal((await older).failureReason, "session_changed");
        assert.equal(state.values.get("cognis_access_token"), "new-token");
        assert.equal(state.values.get("cognis_account"), "new-account");
        assert.equal(
            state.uiCtx.capabilities.get("session:isOfflineValid")(),
            true,
        );
    });
}

test("an identity response cannot clear a changed account using the same token", async () => {
    const state = fixture();
    const deferred = state.deferRequest("/api/v1/auth/session-identity");
    const older = authenticate(state);
    await deferred.entered;
    state.values.set("cognis_account", "new-account");
    deferred.resolve({ ok: false, status: 401 });
    assert.equal((await older).failureReason, "session_changed");
    assert.equal(state.values.get("cognis_account"), "new-account");
    assert.equal(state.values.get("cognis_access_token"), "verified-token");
});

test("a superseded failed account request reports session_changed without using newer offline state", async () => {
    const state = fixture();
    const deferred = state.deferRequest("/api/v1/users/learner/info");
    const older = authenticate(state);
    await deferred.entered;
    state.values.set("cognis_access_token", "new-token");
    await authenticate(state);
    state.disconnect();
    deferred.reject(new TypeError("Synthetic connection failure"));
    assert.equal((await older).failureReason, "session_changed");
    assert.equal(
        state.uiCtx.capabilities.get("session:isOfflineValid")(),
        true,
    );
});

for (const failure of ["status", "throw", "json"]) {
    test(`superseded setup ${failure} cannot alter a newer ready session`, async () => {
        const state = fixture();
        const deferred = state.deferRequest("/api/v1/auth/setup-status");
        const older = authenticate(state);
        await deferred.entered;
        const body = Promise.withResolvers();
        if (failure === "json") {
            const entered = Promise.withResolvers();
            deferred.resolve({
                ok: true,
                json: () => {
                    entered.resolve();
                    return body.promise;
                },
            });
            await entered.promise;
        }
        state.values.set("cognis_access_token", "new-token");
        state.values.set("cognis_account", "new-account");
        assert.equal((await authenticate(state)).authenticated, true);
        if (failure === "throw")
            deferred.reject(new Error("Synthetic setup failure"));
        else if (failure === "status")
            deferred.resolve({ ok: false, status: 403 });
        else
            body.resolve({
                data: {
                    accountInstanceId: "old-instance",
                    requiresSetup: true,
                },
            });
        assert.equal((await older).failureReason, "session_changed");
        assert.equal(
            state.uiCtx.capabilities.get("session:isOfflineValid")(),
            true,
        );
        assert.equal(
            state.uiCtx.capabilities.get("session:getOfflineIdentity")()
                .account,
            "new-account",
        );
        state.disconnect();
        assert.equal((await authenticate(state)).authenticated, true);
    });
}

test("superseded alternate authentication cannot enforce setup or return the former account", async () => {
    const state = fixture();
    const entered = Promise.withResolvers();
    const release = Promise.withResolvers();
    let pending = true;
    state.uiCtx.extendFlow(
        "authenticate-session",
        "apply-alternate-auth",
        { id: "fixture:deferred-alternate" },
        async () => {
            if (!pending) return null;
            pending = false;
            entered.resolve();
            await release.promise;
            return { authenticated: false, reason: "session_changed" };
        },
    );
    const older = authenticate(state);
    await entered.promise;
    state.values.set("cognis_access_token", "new-token");
    state.values.set("cognis_account", "new-account");
    const newer = await authenticate(state);
    assert.equal(newer.authenticated, true);
    assert.equal(newer.accountId, "new-account");
    const requests = state.calls();
    state.resetSetup();
    release.resolve();
    const superseded = await older;
    assert.equal(superseded.authenticated, false);
    assert.equal(superseded.accountId, null);
    assert.equal(superseded.requiresRedirect, false);
    assert.equal(superseded.failureReason, "session_changed");
    assert.equal(state.calls(), requests);
    assert.equal(
        state.uiCtx.capabilities.get("session:isOfflineValid")(),
        true,
    );
    assert.equal(
        state.uiCtx.capabilities.get("session:getOfflineIdentity")().account,
        "new-account",
    );
});
