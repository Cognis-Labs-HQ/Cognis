import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { BROWSER_FLOW_CONTRACTS } from "../../../ui/reuse/flow-contracts.js";
import { registerFloatingMenus } from "../../../ui/reuse/floating-menu-queue.js";
import { installPageReadiness } from "../../../ui/reuse/page-readiness.js";
import { installTutorials } from "../../../ui/reuse/tutorials/index.js";
import { createTopBanners } from "../../../ui/reuse/top-banners.js";
import { registerOfflineRuntime } from "../../../ui/reuse/offline-runtime.js";
import { createReuseResources } from "../../../ui/reuse/resources.js";
import { createSubPageRegistry } from "../../../ui/reuse/sub-page-registry.js";

function storage(entries = []) {
    const values = new Map(entries);
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    };
}

function fixture({
    directAccess = true,
    keyring = true,
    beforeResolve = async () => {},
    beforeVerify = async () => {},
} = {}) {
    const localStorage = storage([
        ["cognis_account", "share:ordinary"],
        ["cognis_access_token", "account-token"],
    ]);
    const sessionStorage = storage();
    const identities = new Map([
        [
            "account-token",
            { sub: "share:ordinary", role: "user", purpose: "session" },
        ],
        [
            "guest-token",
            { sub: "share:resource:guest", role: "user", purpose: "share" },
        ],
    ]);
    const verified = new Map();
    const calls = [];
    const window = new EventTarget();
    window.location = new URL("https://fixture.invalid/share/shr_fixture");
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
    const currentIdentity = () =>
        verified.get(localStorage.getItem("cognis_access_token"));
    uiCtx.capabilities.contribute(
        "session:verifyIdentity",
        async (token = localStorage.getItem("cognis_access_token")) => {
            await beforeVerify(token);
            const identity = identities.get(token) ?? null;
            verified.set(token, identity);
            return identity;
        },
    );
    uiCtx.capabilities.contribute(
        "session:getVerifiedIdentity",
        currentIdentity,
    );
    uiCtx.capabilities.contribute(
        "keyring:activateTemporary",
        async (...args) => {
            calls.push(["activate", ...args]);
            return keyring;
        },
    );
    uiCtx.capabilities.contribute("keyring:endTemporary", () =>
        calls.push(["end"]),
    );
    uiCtx.extendFlow(
        "authenticate-session",
        "validate-stored-token",
        { id: "fixture:account" },
        () => {
            const identity = currentIdentity();
            return identity?.purpose === "session"
                ? {
                      valid: true,
                      purpose: "session",
                      accountId: identity.sub,
                      role: identity.role,
                  }
                : { valid: false };
        },
    );
    loadTestModule(
        new URL("../ui/session-flow-hooks.js", import.meta.url),
        {
            "/static/reuse/page-flow-catalog.js": {},
            "/static/reuse/ui-ctx.js": { uiCtx },
            "./received-share.js": {
                resolveReceivedShare: async (_token, options) => {
                    calls.push(["resolve", options.useAccountKeyring]);
                    await beforeResolve();
                    return {
                        ok: true,
                        json: async () => ({
                            data: {
                                shareId: "resource",
                                resourceType: "calendar",
                                resourceId: "calendar-one",
                                contentUrl: "/calendar/shared",
                                directAccess,
                                guestAccessToken: "guest-token",
                                guestKeyring: {
                                    accountId: "share:resource:guest",
                                    passphrase: "synthetic-passphrase",
                                },
                            },
                        }),
                    };
                },
            },
            "/static/reuse/api-client.js": {
                apiFetch: async () => {
                    throw new Error("Unexpected API");
                },
            },
            "./reuse/share-button.js": {
                GUEST_SESSION_ACTIVE_STORAGE_KEY:
                    "cognis_share_guest_token_active",
                isViewingAsGuest: () => currentIdentity()?.purpose === "share",
            },
            "./session-events.js": {
                listenForShareRevocation() {},
                publishShareRevoked() {},
            },
            "./status-monitor.js": {
                stopShareStatusWatch() {},
                watchShareStatus() {},
            },
        },
        {
            window,
            document: { body: { dataset: {} } },
            localStorage,
            sessionStorage,
            URL,
            AbortController,
            console,
        },
    );
    return {
        uiCtx,
        localStorage,
        sessionStorage,
        window,
        calls,
        identities,
        async run() {
            return (await uiCtx.runFlow("authenticate-session", {}))
                .stageResults["apply-alternate-auth"][0];
        },
    };
}

test("prefixed account keeps account keyring and identity despite forged guest markers", async () => {
    const state = fixture();
    state.sessionStorage.setItem("cognis_share_guest_token_active", "1");
    state.sessionStorage.setItem("cognis_prev_access_token", "forged");
    const session = await state.run();
    assert.equal(session.authenticated, true);
    assert.equal(session.isGuestSession, false);
    assert.equal(session.accountId, "share:ordinary");
    assert.deepEqual(state.calls, [["resolve", true]]);
    assert.equal(
        state.localStorage.getItem("cognis_access_token"),
        "account-token",
    );
});

test("verified guest activates keyring and restores the original account on exit", async () => {
    const state = fixture({ directAccess: false });
    assert.equal((await state.run()).isGuestSession, true);
    assert.equal(
        state.localStorage.getItem("cognis_access_token"),
        "guest-token",
    );
    assert.deepEqual(state.calls.at(-1), [
        "activate",
        "share:resource:guest",
        "synthetic-passphrase",
    ]);
    state.window.dispatchEvent(new Event("beforeunload"));
    assert.equal(
        state.localStorage.getItem("cognis_access_token"),
        "account-token",
    );
    assert.equal(
        state.localStorage.getItem("cognis_account"),
        "share:ordinary",
    );
});

test("failed guest keyring activation never yields an authenticated guest", async () => {
    const state = fixture({ directAccess: false, keyring: false });
    assert.equal((await state.run()).authenticated, false);
    assert.equal(
        state.localStorage.getItem("cognis_access_token"),
        "account-token",
    );
});

test("guest resource navigation retains scope and server revocation ends the active guest", async () => {
    const state = fixture({ directAccess: false });
    await state.run();
    state.window.location = new URL("https://fixture.invalid/calendar/shared");
    assert.equal((await state.run()).isGuestSession, true);
    state.identities.delete("guest-token");
    assert.equal((await state.run()).authenticated, false);
    assert.equal(
        state.localStorage.getItem("cognis_access_token"),
        "account-token",
    );
});

test("delayed share resolution and guest verification cannot replace a newer account session", async () => {
    for (const stage of ["resolve", "verify"]) {
        let release;
        let arrived;
        const ready = new Promise((resolve) => {
            arrived = resolve;
        });
        const pending = new Promise((resolve) => {
            release = resolve;
        });
        const wait = async () => {
            arrived();
            await pending;
        };
        const state = fixture({
            directAccess: false,
            beforeResolve: stage === "resolve" ? wait : async () => {},
            beforeVerify: async (token) => {
                if (stage === "verify" && token === "guest-token") await wait();
            },
        });
        const result = state.run();
        await ready;
        state.localStorage.setItem("cognis_access_token", "new-account-token");
        state.localStorage.setItem("cognis_account", "new-account");
        release();
        assert.equal((await result).authenticated, false);
        assert.equal(
            state.localStorage.getItem("cognis_access_token"),
            "new-account-token",
        );
        assert.equal(
            state.localStorage.getItem("cognis_account"),
            "new-account",
        );
    }
});

test("a newer share navigation supersedes older guest identity verification", async () => {
    let release;
    let arrived;
    let waits = 0;
    const ready = new Promise((resolve) => {
        arrived = resolve;
    });
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    const state = fixture({
        directAccess: false,
        beforeVerify: async (token) => {
            if (token === "guest-token" && waits++ === 0) {
                arrived();
                await pending;
            }
        },
    });
    const old = state.run();
    await ready;
    state.window.location = new URL("https://fixture.invalid/share/shr_newer");
    const newer = await state.run();
    assert.equal(newer.authenticated, true);
    release();
    assert.equal((await old).authenticated, false);
    assert.equal(
        state.calls.filter((call) => call[0] === "activate").length,
        1,
    );
    assert.equal(
        state.localStorage.getItem("cognis_access_token"),
        "guest-token",
    );
});
