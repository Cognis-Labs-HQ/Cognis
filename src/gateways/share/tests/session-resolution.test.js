import test from "node:test";
import assert from "node:assert/strict";
import { uiCtx as host } from "../../../ui/reuse/ui-ctx.js";
import { createCapabilityRegistry } from "../../../ui/reuse/capabilities.js";
import { createDiagnosticFixture } from "../../../tooling/reuse/diagnostic-fixture.ts";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../../ui/reuse/escape-html.js";

function deferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}
function fixture(
    testContext,
    {
        signedIn = false,
        pausePrompt = false,
        pauseActivation = false,
        answers = ["fixture-password"],
    } = {},
) {
    const local = new Map(
        signedIn
            ? [
                  ["cognis_account", "account-owner"],
                  ["cognis_access_token", "account-token"],
              ]
            : [],
    );
    const session = new Map();
    const storage = (values) => ({
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: (key) => values.delete(key),
    });
    const window = new EventTarget();
    window.location = {
        pathname: "/share/shr_fixture",
        search: "",
        href: "https://cognis.test/share/shr_fixture",
        origin: "https://cognis.test",
    };
    const calls = {
        prompts: 0,
        requests: [],
        activations: 0,
        ends: 0,
        toasts: [],
        navigations: [],
    };
    const gate = deferred();
    const activationGate = deferred();
    let activationResult = true;
    let cancelNext = false;
    const capabilities = createCapabilityRegistry();
    const hooks = [];
    const ctx = {
        ...host,
        capabilities,
        extendFlow: (flow, stage, meta, handler) => {
            host.extendFlow(flow, stage, meta, handler);
            hooks.push([flow, stage, meta.id]);
        },
    };
    testContext.after(() => {
        for (const args of hooks.reverse()) host.removeFlowHook(...args);
    });
    let unlocked = false;
    let revoke;
    capabilities.contribute("keyring:activateTemporary", async () => {
        calls.activations++;
        if (pauseActivation) await activationGate.promise;
        unlocked = activationResult;
        return activationResult;
    });
    capabilities.contribute("keyring:isUnlocked", () => unlocked);
    capabilities.contribute("keyring:endTemporary", () => {
        calls.ends++;
        unlocked = false;
    });
    capabilities.contribute("ui:navigate", async (path) => {
        calls.navigations.push(path);
        return true;
    });
    const globals = {
        window,
        document: { body: { dataset: {} } },
        localStorage: storage(local),
        sessionStorage: storage(session),
        Headers,
        Response,
        AbortController,
        URL,
        Promise,
    };
    const request = async (path, options = {}) => {
        calls.requests.push({ path, options });
        const password = new Headers(options.headers).get(
            "x-cognis-share-password",
        );
        return password === "fixture-password"
            ? Response.json({
                  data: {
                      shareId: "share-fixture",
                      resourceType: "fixture",
                      resourceId: "item",
                      guestAccessToken: "guest-token",
                      guestProfile: { displayName: "Visitor" },
                      guestKeyring: {
                          accountId: "share:fixture",
                          passphrase: "fixture-secret",
                      },
                      page: {},
                  },
              })
            : Response.json(
                  { error: { code: "password_required" } },
                  { status: 401 },
              );
    };
    const received = loadTestModule(
        new URL("../ui/received-share.js", import.meta.url),
        {
            "/static/reuse/i18n.js": {
                createI18n: async () => ({ t: (key) => key }),
            },
            "/static/reuse/api-client.js": { apiFetch: request },
            "/static/reuse/popup.js": {
                openPopup: async (options) => {
                    calls.prompts++;
                    const password =
                        answers.length > 1 ? answers.shift() : answers[0];
                    options.onOpen({
                        querySelector: (selector) =>
                            selector === "#share-unlock-password"
                                ? { value: password, focus() {} }
                                : null,
                    });
                    if (pausePrompt) await gate.promise;
                    if (cancelNext) {
                        cancelNext = false;
                        return "cancel";
                    }
                    return "unlock";
                },
            },
            "/static/reuse/escape-html.js": { escapeHtml },
            "/static/reuse/ui-ctx.js": { uiCtx: ctx },
            "/static/reuse/toast.js": {
                showToast: (...args) => calls.toasts.push(args),
            },
        },
        globals,
    );
    ctx.extendFlow(
        "authenticate-session",
        "validate-stored-token",
        { id: "fixture:account" },
        () => ({
            valid: local.get("cognis_account") === "account-owner",
            accountId: "account-owner",
            role: "user",
        }),
    );
    loadTestModule(
        new URL("../ui/session-flow-hooks.js", import.meta.url),
        {
            "/static/reuse/capabilities.js": createDiagnosticFixture(),
            "/static/reuse/page-flow-catalog.js": {},
            "/static/reuse/ui-ctx.js": { uiCtx: ctx },
            "./received-share.js": received,
            "/static/reuse/api-client.js": { apiFetch: request },
            "./reuse/share-button.js": {
                GUEST_SESSION_ACTIVE_STORAGE_KEY:
                    "cognis_share_guest_token_active",
                isViewingAsGuest: () =>
                    session.get("cognis_share_guest_token_active") === "1" ||
                    (local.get("cognis_account") ?? "").startsWith("share:"),
            },
            "./session-events.js": {
                listenForShareRevocation: (callback) => {
                    revoke = callback;
                },
                publishShareRevoked: () => assert.fail("Unexpected revocation"),
            },
            "./status-monitor.js": {
                stopShareStatusWatch() {},
                watchShareStatus() {},
            },
        },
        globals,
    );
    return {
        calls,
        local,
        session,
        gate,
        activationGate,
        ctx,
        cancelNext: () => {
            cancelNext = true;
        },
        setActivationResult: (value) => {
            activationResult = value;
        },
        revoke: () => revoke("share-fixture"),
        run: async (path = "/share/shr_fixture") =>
            (await host.runFlow("authenticate-session", { routePath: path }))
                .stageResults["apply-alternate-auth"][0],
    };
}

test("repeated protected share authentication preserves one guest session and the original account", async (testContext) => {
    const h = fixture(testContext, { signedIn: true });
    assert.equal((await h.run()).authenticated, true);
    assert.equal((await h.run()).authenticated, true);
    assert.equal(h.calls.prompts, 1);
    assert.equal(h.calls.activations, 1);
    assert.equal(h.calls.requests.length, 2);
    await h.run("/dashboard");
    assert.equal(h.local.get("cognis_account"), "account-owner");
    assert.equal(h.local.get("cognis_access_token"), "account-token");
});

test("concurrent protected share authentication coalesces the password prompt and guest activation", async (testContext) => {
    const h = fixture(testContext, { pausePrompt: true });
    const first = h.run();
    const second = h.run();
    await new Promise(setImmediate);
    assert.equal(h.calls.prompts, 1);
    h.gate.resolve();
    const result = await Promise.all([first, second]);
    assert.ok(result.every((session) => session.authenticated));
    assert.equal(h.calls.activations, 1);
    assert.equal(h.calls.requests.length, 2);
});

test("guest keyring requests reuse an unlocked guest vault", async (testContext) => {
    const h = fixture(testContext);
    await h.run();
    const ensure = h.ctx.capabilities.get("session:ensureGuestKeyring");
    assert.equal(await ensure(), true);
    assert.equal(await ensure(), true);
    assert.equal(h.calls.activations, 1);
});

test("authentication begun during guest keyring activation reuses the pending session", async (testContext) => {
    const h = fixture(testContext, { signedIn: true, pauseActivation: true });
    const first = h.run();
    await new Promise(setImmediate);
    const second = h.run();
    await new Promise(setImmediate);
    assert.equal(h.calls.prompts, 1);
    assert.equal(h.calls.activations, 1);
    h.activationGate.resolve();
    assert.ok(
        (await Promise.all([first, second])).every(
            (result) => result.authenticated,
        ),
    );
});

test("navigation away invalidates pending share authentication before guest credentials are installed", async (testContext) => {
    const h = fixture(testContext, { signedIn: true, pausePrompt: true });
    const pending = h.run();
    await new Promise(setImmediate);
    await h.run("/dashboard");
    h.gate.resolve();
    assert.equal((await pending).authenticated, false);
    assert.equal(h.local.get("cognis_account"), "account-owner");
    assert.equal(h.calls.activations, 0);
});

test("pending Share authentication does not reuse a previous account identity", async (testContext) => {
    const h = fixture(testContext, { signedIn: true, pausePrompt: true });
    const prior = h.run();
    await new Promise(setImmediate);
    h.local.set("cognis_account", "another-account");
    h.local.set("cognis_access_token", "another-token");
    const current = h.run();
    await new Promise(setImmediate);
    h.gate.resolve();
    assert.equal((await prior).authenticated, false);
    assert.equal((await current).authenticated, true);
    assert.equal(h.calls.activations, 1);
    await h.run("/dashboard");
    assert.equal(h.local.get("cognis_account"), "another-account");
});

test("cancellation and failed keyring activation release pending Share authentication for retry", async (testContext) => {
    const h = fixture(testContext, { signedIn: true });
    h.cancelNext();
    assert.equal((await h.run()).authenticated, false);
    h.setActivationResult(false);
    assert.equal((await h.run()).authenticated, false);
    assert.equal(h.local.get("cognis_access_token"), "account-token");
    h.setActivationResult(true);
    assert.equal((await h.run()).authenticated, true);
});

test("revocation invalidates a resolved share without repeating password prompts", async (testContext) => {
    const h = fixture(testContext, { signedIn: true });
    await h.run();
    h.revoke();
    assert.equal((await h.run()).authenticated, false);
    assert.equal(h.calls.prompts, 1);
    assert.equal(h.calls.activations, 1);
    assert.equal(h.local.get("cognis_access_token"), "account-token");
});

test("an incorrect password still permits a deliberate retry", async (testContext) => {
    const h = fixture(testContext, { answers: ["wrong", "fixture-password"] });
    assert.equal((await h.run()).authenticated, true);
    assert.equal(h.calls.prompts, 2);
    assert.equal(h.calls.activations, 1);
    assert.equal(h.calls.toasts.length, 1);
});
