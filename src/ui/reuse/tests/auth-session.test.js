import test from "node:test";
import assert from "node:assert/strict";

import {
    clearStoredAuthSession,
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
    fetchImpl = async () => ({ ok: false, status: 401 }),
} = {}) {
    const localStorage = createLocalStorageMock(entries);
    const redirects = [];
    const cookieWrites = [];

    globalThis.localStorage = localStorage;
    globalThis.fetch = fetchImpl;
    globalThis.window = {
        location: {
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
            cognis_token: "token-1",
            cognis_account: "alice",
        },
        fetchImpl: async (url, options) => {
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
            cognis_token: "token-1",
            cognis_display_name: "Orphaned",
        },
    });

    const redirected = await redirectToDashboardIfAuthenticated();

    assert.equal(redirected, false);
    assert.equal(mocks.localStorage.has("cognis_token"), false);
    assert.equal(mocks.localStorage.has("cognis_display_name"), false);
    assert.ok(
        mocks.cookieWrites.includes("cognis_access_token=; Path=/; Max-Age=0"),
    );
});

test("clearStoredAuthSession clears both current and legacy auth cookies", () => {
    const mocks = installBrowserMocks();

    clearStoredAuthSession();

    assert.ok(mocks.cookieWrites.includes("cognis_token=; Path=/; Max-Age=0"));
    assert.ok(
        mocks.cookieWrites.includes("cognis_access_token=; Path=/; Max-Age=0"),
    );
});
