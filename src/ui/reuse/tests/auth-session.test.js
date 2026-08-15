import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

/**
 * Load auth-session.js in a controlled vm context, replacing its external
 * imports with mocks so we can inject a controlled `uiCtx.runFlow` and
 * verify that each exported helper correctly delegates to the flow and acts
 * on its result.
 */
function loadAuthSessionForTests({
    runFlowImpl = async () => ({}),
    pathname = "/dashboard",
    search = "",
    hash = "",
} = {}) {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/auth-session.js"),
        "utf8",
    );
    const testableSource = source
        .replace(/^import .*;\n/gm, "")
        .replace(/\bexport\s+/g, "");

    const redirects = [];
    const cookieWrites = [];
    const store = new Map();
    const context = vm.createContext({
        uiCtx: {
            runFlow: runFlowImpl,
            flowExists: () => true,
        },
        window: {
            location: {
                pathname,
                search,
                hash,
                origin: "https://cognis.test",
                replace(url) {
                    redirects.push(url);
                },
            },
        },
        localStorage: {
            getItem: (key) => store.get(key) ?? null,
            setItem: (key, value) => store.set(key, String(value)),
            removeItem: (key) => store.delete(key),
            has: (key) => store.has(key),
        },
        document: Object.defineProperty({}, "cookie", {
            configurable: true,
            get() {
                return "";
            },
            set(value) {
                cookieWrites.push(value);
            },
        }),
        console,
        withLoginReturnPath(loginUrl) {
            const url = new URL(loginUrl, "https://cognis.test");
            url.searchParams.set("next", `${pathname}${search}${hash}`);
            return `${url.pathname}${url.search}${url.hash}`;
        },
        __testExports: {},
    });
    vm.runInContext(
        testableSource +
            "\nglobalThis.__testExports = { redirectToDashboardIfAuthenticated, checkIsAuthenticated, ensureFullAccountSession, getShareContext, clearStoredAuthSession };\n",
        context,
    );
    return { exports: context.__testExports, redirects, cookieWrites };
}

function flowResult(session) {
    return { stageResults: { "resolve-session": [session] } };
}

test("redirectToDashboardIfAuthenticated redirects to /dashboard when authenticated", async () => {
    const { exports, redirects } = loadAuthSessionForTests({
        runFlowImpl: async () => flowResult({ authenticated: true }),
    });
    const result = await exports.redirectToDashboardIfAuthenticated();
    assert.equal(result, true);
    assert.deepEqual(redirects, ["/dashboard"]);
});

test("redirectToDashboardIfAuthenticated returns false when not authenticated", async () => {
    const { exports, redirects } = loadAuthSessionForTests({
        runFlowImpl: async () => flowResult({ authenticated: false }),
    });
    const result = await exports.redirectToDashboardIfAuthenticated();
    assert.equal(result, false);
    assert.deepEqual(redirects, []);
});

test("checkIsAuthenticated returns true when flow resolves as authenticated", async () => {
    const { exports } = loadAuthSessionForTests({
        runFlowImpl: async () => flowResult({ authenticated: true }),
    });
    const result = await exports.checkIsAuthenticated();
    assert.equal(result, true);
});

test("checkIsAuthenticated returns false when flow resolves as unauthenticated", async () => {
    const { exports } = loadAuthSessionForTests({
        runFlowImpl: async () => flowResult({ authenticated: false }),
    });
    const result = await exports.checkIsAuthenticated();
    assert.equal(result, false);
});

test("ensureFullAccountSession returns true when authenticated with no redirect", async () => {
    const { exports, redirects } = loadAuthSessionForTests({
        runFlowImpl: async () =>
            flowResult({
                authenticated: true,
                requiresRedirect: false,
                redirectTo: null,
                shareContext: null,
            }),
    });
    const result = await exports.ensureFullAccountSession();
    assert.equal(result, true);
    assert.deepEqual(redirects, []);
});

test("ensureFullAccountSession retains the current page in a login redirect", async () => {
    const { exports, redirects } = loadAuthSessionForTests({
        pathname: "/settings",
        search: "?section=security",
        hash: "#password",
        runFlowImpl: async () =>
            flowResult({
                authenticated: false,
                requiresRedirect: true,
                redirectTo: "/login?reason=session_expired",
            }),
    });
    const result = await exports.ensureFullAccountSession();
    assert.equal(result, false);
    assert.deepEqual(redirects, [
        "/login?reason=session_expired&next=%2Fsettings%3Fsection%3Dsecurity%23password",
    ]);
});

test("ensureFullAccountSession stores shareContext for later getShareContext() access", async () => {
    const shareContext = {
        resourceType: "meeting",
        resourceId: "mtg-1",
        grantedCapabilities: [],
    };
    const { exports } = loadAuthSessionForTests({
        runFlowImpl: async () =>
            flowResult({
                authenticated: true,
                requiresRedirect: false,
                redirectTo: null,
                shareContext,
            }),
    });
    await exports.ensureFullAccountSession();
    assert.deepEqual(exports.getShareContext(), shareContext);
});

test("getShareContext returns null when ensureFullAccountSession has not run", () => {
    const { exports } = loadAuthSessionForTests();
    assert.equal(exports.getShareContext(), null);
});

test("clearStoredAuthSession clears the access-token cookie", () => {
    const { exports, cookieWrites } = loadAuthSessionForTests();
    exports.clearStoredAuthSession();
    assert.ok(cookieWrites.includes("cognis_access_token=; Path=/; Max-Age=0"));
});
