import test from "node:test";
import assert from "node:assert/strict";

import {
    clearStoredAuthSession,
    ensureFullAccountSession,
    redirectToDashboardIfAuthenticated,
} from "../auth-session.js";

function createLocalStorageMock(entries = {}) {
    const store = new Map(Object.entries(entries));
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        has(key) {
            return store.has(key);
        },
    };
}

function installBrowserMocks({
    entries = {},
    fetchImplementation = async () => ({ ok: false, status: 401 }),
    pathname = "/dashboard",
} = {}) {
    const localStorage = createLocalStorageMock(entries);
    const redirects = [];
    const cookieWrites = [];

    globalThis.localStorage = localStorage;
    globalThis.fetch = fetchImplementation;
    globalThis.window = {
        location: {
            pathname,
            replace(url) {
                redirects.push(url);
            },
        },
    };
    globalThis.document = {};
    Object.defineProperty(globalThis.document, "cookie", {
        configurable: true,
        get() {
            return "";
        },
        set(value) {
            cookieWrites.push(value);
        },
    });

    return { localStorage, redirects, cookieWrites };
}

test("redirectToDashboardIfAuthenticated requires a stored account matching the token", async () => {
    let requestedUrl = "";
    const mocks = installBrowserMocks({
        entries: {
            cognis_access_token: "token-1",
            cognis_account: "alice",
        },
        fetchImplementation: async (url, options) => {
            requestedUrl = String(url);
            assert.equal(options.headers.authorization, "Bearer token-1");
            return {
                ok: true,
                status: 200,
                async json() {
                    return { data: { username: "alice", enabled: true } };
                },
            };
        },
    });

    const redirected = await redirectToDashboardIfAuthenticated();

    assert.equal(redirected, true);
    assert.equal(requestedUrl, "/api/v1/users/alice/info");
    assert.deepEqual(mocks.redirects, ["/dashboard"]);
});

test("redirectToDashboardIfAuthenticated clears stale sessions without an account", async () => {
    const mocks = installBrowserMocks({
        entries: {
            cognis_access_token: "token-1",
            cognis_display_name: "Orphaned",
        },
    });

    const redirected = await redirectToDashboardIfAuthenticated();

    assert.equal(redirected, false);
    assert.equal(mocks.localStorage.has("cognis_access_token"), false);
    assert.equal(mocks.localStorage.has("cognis_display_name"), false);
    assert.ok(
        mocks.cookieWrites.includes("cognis_access_token=; Path=/; Max-Age=0"),
    );
});

test("clearStoredAuthSession clears the access-token cookie", () => {
    const mocks = installBrowserMocks();

    clearStoredAuthSession();

    assert.deepEqual(mocks.cookieWrites, [
        "cognis_access_token=; Path=/; Max-Age=0",
    ]);
});

test("ensureFullAccountSession returns true when authenticated and TFA setup not required", async () => {
    const mocks = installBrowserMocks({
        entries: {
            cognis_access_token: "token-abc",
            cognis_account: "bob",
        },
        fetchImplementation: async (url) => {
            if (String(url).includes("/info")) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { data: { username: "bob", enabled: true } };
                    },
                };
            }
            if (String(url).includes("/tfa/status")) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { data: { requiresSetup: false } };
                    },
                };
            }
            return { ok: false, status: 500 };
        },
    });

    const result = await ensureFullAccountSession();

    assert.equal(result, true);
    assert.deepEqual(mocks.redirects, []);
});

test("ensureFullAccountSession redirects to /settings when TFA setup is required", async () => {
    const mocks = installBrowserMocks({
        entries: {
            cognis_access_token: "token-abc",
            cognis_account: "bob",
        },
        fetchImplementation: async (url) => {
            if (String(url).includes("/info")) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { data: { username: "bob", enabled: true } };
                    },
                };
            }
            if (String(url).includes("/tfa/status")) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { data: { requiresSetup: true } };
                    },
                };
            }
            return { ok: false, status: 500 };
        },
        pathname: "/dashboard",
    });

    const result = await ensureFullAccountSession();

    assert.equal(result, false);
    assert.deepEqual(mocks.redirects, ["/settings?enforce_tfa=1"]);
});

test("ensureFullAccountSession does not redirect when already on /settings with TFA required", async () => {
    const mocks = installBrowserMocks({
        entries: {
            cognis_access_token: "token-abc",
            cognis_account: "bob",
        },
        fetchImplementation: async (url) => {
            if (String(url).includes("/info")) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { data: { username: "bob", enabled: true } };
                    },
                };
            }
            if (String(url).includes("/tfa/status")) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { data: { requiresSetup: true } };
                    },
                };
            }
            return { ok: false, status: 500 };
        },
        pathname: "/settings",
    });

    const result = await ensureFullAccountSession();

    assert.equal(result, true);
    assert.deepEqual(mocks.redirects, []);
});

test("ensureFullAccountSession redirects to /login when not authenticated", async () => {
    const mocks = installBrowserMocks({
        entries: {},
    });

    const result = await ensureFullAccountSession();

    assert.equal(result, false);
    assert.deepEqual(mocks.redirects, ["/login?reason=session_expired"]);
});

test("ensureFullAccountSession redirects to /login with account_disabled reason", async () => {
    const mocks = installBrowserMocks({
        entries: {
            cognis_access_token: "token-abc",
            cognis_account: "carol",
        },
        fetchImplementation: async (url) => {
            if (String(url).includes("/info")) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { data: { username: "carol", enabled: false } };
                    },
                };
            }
            return { ok: false, status: 500 };
        },
    });

    const result = await ensureFullAccountSession();

    assert.equal(result, false);
    assert.deepEqual(mocks.redirects, ["/login?reason=account_disabled"]);
});

test("ensureFullAccountSession proceeds when TFA status check fails with a network error", async () => {
    const mocks = installBrowserMocks({
        entries: {
            cognis_access_token: "token-abc",
            cognis_account: "bob",
        },
        fetchImplementation: async (url) => {
            if (String(url).includes("/info")) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { data: { username: "bob", enabled: true } };
                    },
                };
            }
            throw new Error("network error");
        },
    });

    const result = await ensureFullAccountSession();

    assert.equal(result, true);
    assert.deepEqual(mocks.redirects, []);
});
