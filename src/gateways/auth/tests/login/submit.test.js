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

for (const [code, key] of [
    ["session_unavailable", "ui.app.login.error.generic"],
    ["tfa_unavailable", "ui.app.login.error.generic"],
    ["account_disabled", "ui.app.login.reason.account_disabled"],
]) {
    test(`login translates ${code} without exposing server failure text`, async () => {
        const { createLoginSubmitHandler } = loadTestModule(
            new URL("../../ui/login-page/submit.js", import.meta.url),
            {
                "/static/reuse/page-entry.js": {
                    beginPageLoading: () => () => {},
                },
            },
            {
                console,
                HTMLElement: class {},
                fetch: async () => ({
                    ok: false,
                    json: async () => ({
                        error: { code, message: "private server detail" },
                    }),
                }),
            },
        );
        const messages = [];
        const handler = createLoginSubmitHandler({
            getState: () => ({}),
            showToast: (message) => messages.push(message),
            i18n: { t: (value) => `translated:${value}` },
        });
        await handler({
            preventDefault() {},
            target: {
                querySelector: (selector) =>
                    selector === "#login-tfa-fields"
                        ? null
                        : { value: "fixture" },
            },
        });
        assert.deepEqual(messages, [`translated:${key}`]);
    });
}

for (const outcome of ["cancel", "retry"]) {
    test(`TFA verification ${outcome} preserves pending-flow ownership and only commits a current success`, async () => {
        class Element {
            hidden = false;
        }
        class Input extends Element {
            constructor(value) {
                super();
                this.value = value;
            }
        }
        let current = true;
        let release;
        let attempts = 0;
        const finished = [];
        const messages = [];
        const client = {
            verifyCode: async () => {
                attempts++;
                if (outcome === "cancel")
                    return new Promise((resolve) => {
                        release = resolve;
                    });
                return attempts === 1
                    ? {
                          response: { ok: false },
                          body: {
                              error: { message: "invalid_verification_code" },
                          },
                      }
                    : {
                          response: { ok: true },
                          body: { data: { token: "synthetic-session" } },
                      };
            },
            resolveErrorMessage: () => "translated-invalid-code",
        };
        const { createLoginSubmitHandler } = loadTestModule(
            new URL("../../ui/login-page/submit.js", import.meta.url),
            {
                "/static/reuse/page-entry.js": {
                    beginPageLoading: () => () => {},
                },
            },
            { console, HTMLElement: Element, HTMLInputElement: Input },
        );
        const handler = createLoginSubmitHandler({
            getState: () => ({
                currentTfaLoginAttemptId: "synthetic-attempt",
                pendingKeyringPassword: "synthetic-password",
            }),
            beginAttempt: () => () => current,
            loadTfaLoginClient: async () => client,
            finalizeAuthenticatedSession: async (...args) =>
                finished.push(args),
            showToast: (message) => messages.push(message),
            i18n: { t: (key) => key },
        });
        const event = {
            preventDefault() {},
            target: {
                querySelector: (selector) =>
                    selector === "#login-tfa-fields"
                        ? new Element()
                        : new Input("12345678"),
            },
        };
        const first = handler(event);
        await new Promise((resolve) => setImmediate(resolve));
        if (outcome === "cancel") {
            current = false;
            release({
                response: { ok: true },
                body: { data: { token: "synthetic-session" } },
            });
            await first;
            assert.equal(finished.length, 0);
            assert.equal(messages.length, 0);
        } else {
            await first;
            assert.deepEqual(messages, ["translated-invalid-code"]);
            assert.equal(finished.length, 0);
            await handler(event);
            assert.equal(finished.length, 1);
            assert.equal(finished[0][1], "synthetic-password");
        }
    });
}
