import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

function fixture(navigate, syncTimezoneOnLogin) {
    let loading = 0;
    const client = loadTestModule(
        new URL("../../ui/login-page/navigation.js", import.meta.url),
        {
            "/static/reuse/page-entry.js": {
                beginPageLoading: () => {
                    loading++;
                    return () => {
                        loading--;
                    };
                },
            },
            "/static/reuse/ui-ctx.js": {
                uiCtx: {
                    capabilities: {
                        get: (name) =>
                            name === "ui:navigate" ? navigate : undefined,
                    },
                },
            },
            "/static/reuse/offline-identity.js": {
                captureAccountGuard: () => () => {},
            },
            "/static/reuse/timestamp.js": { syncTimezoneOnLogin },
        },
        { console },
    );
    return { ...client, loading: () => loading };
}

test("login uses SPA replacement with loading and never waits for optional timezone synchronization", async () => {
    let release;
    let synchronized;
    const mounted = new Promise((resolve) => {
        release = resolve;
    });
    const state = fixture(
        async (path, options) => {
            assert.equal(path, "/dashboard");
            assert.equal(options.replace, true);
            return mounted;
        },
        (account) => {
            synchronized = account;
            return new Promise(() => {});
        },
    );
    const login = state.navigateAfterLogin("learner");
    assert.equal(state.loading(), 1);
    assert.equal(synchronized, undefined);
    release(true);
    await login;
    assert.equal(state.loading(), 0);
    assert.equal(synchronized, "learner");
});

test("failed Dashboard navigation releases loading and cannot start background preference writes", async () => {
    const state = fixture(
        async () => false,
        () => assert.fail("unexpected preference write"),
    );
    await assert.rejects(
        state.navigateAfterLogin("learner"),
        /login_navigation_failed/,
    );
    assert.equal(state.loading(), 0);
});
