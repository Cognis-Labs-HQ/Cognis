import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function clientFixture() {
    class Element {
        hidden = false;
        childElementCount = 1;
        isConnected = true;
        value = "";
        classList = { toggle() {}, add() {} };
        listeners = new Map();
        children = [];
        setAttribute() {}
        focus() {}
        replaceChildren() {
            this.children = [];
        }
        appendChild(child) {
            this.children.push(child);
        }
        addEventListener(type, callback) {
            this.listeners.set(type, callback);
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
    const root = { querySelector: (selector) => elements.get(selector) };
    const toasts = [];
    const logs = [];
    const exports = loadTestModule(
        new URL("../ui/login-flow.js", import.meta.url),
        {
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
            console: { warn() {}, error: (...args) => logs.push(args) },
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
