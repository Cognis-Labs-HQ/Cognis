import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function clientFixture({
    invalidResend = false,
    respond = () => assert.fail("unexpected fetch"),
    abortSignal = AbortSignal,
} = {}) {
    class Element {
        hidden = false;
        childElementCount = 1;
        isConnected = true;
        value = "";
        classes = new Set();
        attributes = new Map();
        classList = {
            toggle: (name, active) =>
                active ? this.classes.add(name) : this.classes.delete(name),
            add: (name) => this.classes.add(name),
        };
        listeners = new Map();
        children = [];
        setAttribute(name, value) {
            this.attributes.set(name, value);
        }
        focus() {}
        replaceChildren() {
            this.children = [];
        }
        appendChild(child) {
            this.children.push(child);
        }
        addEventListener(type, callback, options) {
            this.listeners.set(type, callback);
            options?.signal?.addEventListener(
                "abort",
                () => {
                    if (this.listeners.get(type) === callback)
                        this.listeners.delete(type);
                },
                { once: true },
            );
        }
        querySelectorAll() {
            return this.children;
        }
    }
    const elements = new Map(
        [
            "#login-tfa-fields",
            "#login-credential-fields",
            "#login-username",
            "#login-password",
            "#login-tfa-code",
            "#login-tfa-method",
            "#login-tfa-method-nav",
            "#login-tfa-resend-action",
        ].map((selector) => [selector, new Element()]),
    );
    if (invalidResend) elements.set("#login-tfa-resend-action", {});
    const root = { querySelector: (selector) => elements.get(selector) };
    const toasts = [];
    const logs = [];
    const exports = loadTestModule(
        new URL("../ui/login-flow.js", import.meta.url),
        {
            "/static/reuse/capabilities.js": {
                bindCapability:
                    () =>
                    (...args) =>
                        logs.push(structuredClone(args)),
            },
            "/static/reuse/auth-setup-route.js": {
                redirectToRequiredTfaSetup() {},
            },
            "/static/reuse/i18n.js": { extendI18n: async (base) => base },
            "/static/reuse/page-styles.js": {
                ensurePageStylesheet: async () => {},
            },
            "/static/reuse/toast.js": {
                showToast: (message, options) =>
                    toasts.push({ message, ...options }),
            },
        },
        {
            fetch: respond,
            AbortController,
            AbortSignal: abortSignal,
            HTMLElement: Element,
            HTMLInputElement: Element,
            HTMLAnchorElement: Element,
            document: { createElement: () => new Element() },
            window: {
                setInterval() {
                    return 1;
                },
                clearInterval() {},
            },
            console: {
                warn() {
                    assert.fail("TFA must use the logging gateway");
                },
                error() {
                    assert.fail("TFA must use the logging gateway");
                },
            },
            Date,
            Map,
            Set,
        },
    );
    return { ...exports, root, toasts, logs };
}

for (const hasRecoveryCodes of [false, true]) {
    test(`initial email selection sends exactly one challenge with ${hasRecoveryCodes ? "recovery codes" : "multiple configured methods"}`, async () => {
        const host = clientFixture();
        const client = await host.createTfaLoginClient({
            baseI18n: { t: (key) => key },
            root: host.root,
        });
        const requests = [];
        client.resendCode = async (payload) => {
            requests.push(payload);
            return {
                response: { ok: true },
                body: { data: { challenge: {} } },
            };
        };
        const smtp = {
            id: "smtp",
            name: "Email",
            loginUi: { challengeOnSelect: true, supportsResend: true },
        };
        await client.switchToTfaPrompt({
            loginAttemptId: "attempt",
            methods: [
                smtp,
                {
                    id: hasRecoveryCodes ? "recovery_code" : "totp",
                    name: "Other",
                },
            ],
        });
        assert.equal(requests.length, 1);
        assert.equal(requests[0].methodId, "smtp");
        host.root
            .querySelector("#login-tfa-method-nav")
            .children[0].listeners.get("click")({ preventDefault() {} });
        assert.equal(requests.length, 1);
    });
}

test("a server-prepared challenge and a selected authenticator never send an additional email", async () => {
    const host = clientFixture();
    const client = await host.createTfaLoginClient({
        baseI18n: { t: (key) => key },
        root: host.root,
    });
    let requests = 0;
    client.resendCode = async () => {
        requests++;
    };
    await client.switchToTfaPrompt({
        loginAttemptId: "attempt",
        methods: [
            { id: "smtp", challenge: {}, loginUi: { challengeOnSelect: true } },
        ],
    });
    await client.switchToTfaPrompt({
        loginAttemptId: "attempt",
        methods: [{ id: "totp", loginUi: {} }],
    });
    assert.equal(requests, 0);
});

for (const failure of ["response", "network"]) {
    test(`initial challenge ${failure} failure is visible to the user`, async () => {
        const host = clientFixture();
        const client = await host.createTfaLoginClient({
            baseI18n: { t: (key) => key },
            root: host.root,
        });
        client.resendCode = async () => {
            if (failure === "network") throw new TypeError("offline");
            return {
                response: { ok: false },
                body: { error: { code: "email_delivery_unavailable" } },
            };
        };
        await client.switchToTfaPrompt({
            loginAttemptId: "attempt",
            methods: [
                {
                    id: "smtp",
                    loginUi: { challengeOnSelect: true, supportsResend: true },
                },
            ],
        });
        await new Promise(setImmediate);
        assert.ok(
            host.toasts.some(
                (toast) =>
                    toast.variant === "error" &&
                    toast.message === "ui.app.login.tfa.challenge_unavailable",
            ),
        );
        if (failure === "network") assert.equal(host.logs.length, 1);
    });
}

test("selecting email after an authenticator requests its first challenge", async () => {
    const host = clientFixture();
    const client = await host.createTfaLoginClient({
        baseI18n: { t: (key) => key },
        root: host.root,
    });
    let requests = 0;
    client.resendCode = async () => {
        requests++;
        return { response: { ok: true }, body: { data: { challenge: {} } } };
    };
    await client.switchToTfaPrompt({
        loginAttemptId: "attempt",
        methods: [
            { id: "totp" },
            {
                id: "smtp",
                loginUi: { challengeOnSelect: true, supportsResend: true },
            },
        ],
    });
    assert.equal(requests, 0);
    host.root
        .querySelector("#login-tfa-method-nav")
        .children[1].listeners.get("click")({ preventDefault() {} });
    await new Promise(setImmediate);
    assert.equal(requests, 1);
});

test("an invalid resend control reports one structured gateway diagnostic", async () => {
    const host = clientFixture({ invalidResend: true });
    const client = await host.createTfaLoginClient({
        baseI18n: { t: (key) => key },
        root: host.root,
    });
    await client.switchToTfaPrompt({
        loginAttemptId: "attempt",
        methods: [{ id: "totp", loginUi: {} }],
    });
    assert.deepEqual(host.logs, [
        [
            "warn",
            "invalid_resend_control",
            { component: "tfa", operation: "resolveResendControl" },
        ],
    ]);
});

for (const alternative of ["totp", "recovery_code"]) {
    test(`a stalled initial email does not block ${alternative} verification`, async (t) => {
        const verified = [];
        const host = clientFixture({
            respond: async (path, options) => {
                assert.equal(path, "/api/v1/tfa/login/verify");
                verified.push(JSON.parse(options.body));
                return Response.json({ data: { accountId: "account" } });
            },
        });
        const client = await host.createTfaLoginClient({
            baseI18n: { t: (key) => key },
            root: host.root,
        });
        let finishDelivery;
        const delivery = new Promise((resolve) => {
            finishDelivery = resolve;
        });
        t.after(() =>
            finishDelivery({
                response: { ok: true },
                body: { data: { challenge: {} } },
            }),
        );
        let requests = 0;
        client.resendCode = () => {
            requests++;
            return delivery;
        };
        let attempt;
        const prompt = client
            .switchToTfaPrompt({
                loginAttemptId: "attempt",
                methods: [
                    {
                        id: "email",
                        loginUi: {
                            challengeOnSelect: true,
                            supportsResend: true,
                        },
                    },
                    { id: alternative },
                ],
            })
            .then((value) => {
                attempt = value;
            });
        await new Promise(setImmediate);
        assert.equal(attempt, "attempt");
        await prompt;
        const tabs = host.root.querySelector("#login-tfa-method-nav").children;
        const click = (index) =>
            tabs[index].listeners.get("click")({ preventDefault() {} });
        click(1);
        click(0);
        assert.equal(requests, 1);
        assert.equal(
            host.root
                .querySelector("#login-tfa-resend-action")
                .attributes.get("aria-disabled"),
            "true",
        );
        click(1);
        const result = await client.verifyCode({
            loginAttemptId: attempt,
            methodId: host.root.querySelector("#login-tfa-method").value,
            code: "123456",
        });
        assert.equal(result.body.data.accountId, "account");
        assert.deepEqual(verified, [
            {
                loginAttemptId: "attempt",
                methodId: alternative,
                code: "123456",
            },
        ]);
        finishDelivery({
            response: { ok: true },
            body: { data: { challenge: {} } },
        });
        await new Promise(setImmediate);
        assert.equal(
            host.root.querySelector("#login-tfa-method").value,
            alternative,
        );
        assert.equal(
            host.root.querySelector("#login-tfa-resend-action").hidden,
            true,
        );
    });
}

test("initial challenge delivery times out without retaining the resend lock", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const deadlines = [];
    const host = clientFixture({
        abortSignal: {
            any: AbortSignal.any,
            timeout(ms) {
                deadlines.push(ms);
                const controller = new AbortController();
                setTimeout(
                    () =>
                        controller.abort(
                            new DOMException("expired", "TimeoutError"),
                        ),
                    ms,
                );
                return controller.signal;
            },
        },
        respond: (_path, { signal }) =>
            new Promise((_resolve, reject) =>
                signal.addEventListener("abort", () => reject(signal.reason), {
                    once: true,
                }),
            ),
    });
    const client = await host.createTfaLoginClient({
        baseI18n: { t: (key) => key },
        root: host.root,
    });
    assert.equal(
        await client.switchToTfaPrompt({
            loginAttemptId: "attempt",
            methods: [
                {
                    id: "email",
                    loginUi: { challengeOnSelect: true, supportsResend: true },
                },
            ],
        }),
        "attempt",
    );
    assert.deepEqual(deadlines, [15_000]);
    t.mock.timers.tick(15_000);
    await new Promise(setImmediate);
    assert.equal(
        host.root
            .querySelector("#login-tfa-resend-action")
            .attributes.get("aria-disabled"),
        "false",
    );
    assert.equal(host.logs.at(-1)[2].errorName, "TimeoutError");
    assert.equal(host.toasts.at(-1).variant, "error");
});

test("a new login prompt aborts obsolete challenge delivery and rebinds resend", async () => {
    const requests = [];
    const host = clientFixture({
        respond: (_path, options) => {
            requests.push({ ...options, payload: JSON.parse(options.body) });
            return new Promise((_resolve, reject) =>
                options.signal.addEventListener(
                    "abort",
                    () => reject(options.signal.reason),
                    { once: true },
                ),
            );
        },
    });
    const client = await host.createTfaLoginClient({
        baseI18n: { t: (key) => key },
        root: host.root,
    });
    const email = {
        id: "email",
        loginUi: { challengeOnSelect: true, supportsResend: true },
    };
    await client.switchToTfaPrompt({
        loginAttemptId: "first",
        methods: [email],
    });
    await client.switchToTfaPrompt({
        loginAttemptId: "second",
        methods: [{ ...email, challenge: {} }],
    });
    assert.equal(requests[0].signal.aborted, true);
    await new Promise(setImmediate);
    assert.equal(host.toasts.length, 0);
    const resend = host.root
        .querySelector("#login-tfa-resend-action")
        .listeners.get("click");
    void resend({ preventDefault() {} });
    assert.equal(requests[1].payload.loginAttemptId, "second");
    await client.switchToTfaPrompt({
        loginAttemptId: "third",
        methods: [{ id: "totp" }],
    });
});
