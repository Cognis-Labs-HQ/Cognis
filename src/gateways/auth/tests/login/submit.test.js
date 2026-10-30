import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

test("login submission shows loading during a delayed request, prevents duplicates and releases it before interactive setup", async () => {
    let loading = 0;
    let calls = 0;
    let release;
    let handled = 0;
    const response = new Promise((resolve) => {
        release = resolve;
    });
    const { createLoginSubmitHandler } = loadTestModule(
        new URL("../../ui/login-page/submit.js", import.meta.url),
        {
            "/static/reuse/page-entry.js": {
                beginPageLoading: () => {
                    loading++;
                    let finished = false;
                    return () => {
                        if (!finished) loading--;
                        finished = true;
                    };
                },
            },
        },
        {
            console,
            HTMLElement: class {},
            fetch: async () => {
                calls++;
                return response;
            },
        },
    );
    const handler = createLoginSubmitHandler({
        getState: () => ({}),
        handleAuthResult: async () => {
            assert.equal(loading, 0);
            handled++;
        },
        showToast: () => assert.fail("unexpected toast"),
        i18n: { t: (key) => key },
    });
    const event = {
        preventDefault() {},
        target: {
            querySelector: (selector) =>
                selector === "#login-tfa-fields" ? null : { value: "fixture" },
        },
    };
    const first = handler(event);
    assert.equal(loading, 1);
    await handler(event);
    assert.equal(calls, 1);
    release({
        ok: true,
        json: async () => ({ data: { accountId: "fixture" } }),
    });
    await first;
    assert.equal(handled, 1);
    assert.equal(loading, 0);
});
