import assert from "node:assert/strict";
import test from "node:test";
import { importTestModule } from "../../../../tooling/reuse/test-module.ts";
import { createLoginClientLoaders } from "../../ui/login-page/client-loaders.js";
import { createLoginContinuation } from "../../ui/login-page/continuation.js";
test("mounted login keeps newer prompt busy when an older render finishes", async () => {
    const gates = [];
    let newestState;
    let composerOptions;
    const data = {
        tfaRequired: true,
        loginUrl: "/login",
        loginAttemptId: "tfa_login_aaaaaaaaaaaaaaaaaaaaaaaa",
        methods: [{ id: "email" }],
    };
    class Element {
        constructor() {
            this.hidden = false;
            this.handlers = new Map();
        }
        addEventListener(name, handler) {
            this.handlers.set(name, handler);
        }
        querySelector() {
            return null;
        }
        replaceChildren() {}
    }
    class Input extends Element {}
    let form = new Element();
    const controls = new Map([
        ["#login-tfa-cancel", new Element()],
        ["#login-continuation-retry", new Element()],
        ["#sso-buttons", new Element()],
    ]);
    const root = {
        querySelector: (name) =>
            name === "#login-form" ? form : (controls.get(name) ?? null),
    };
    const i18n = { t: (key) => key };
    const noop = () => {};
    const imports = {
        "./continuation.js": { createLoginContinuation },
        "./submit.js": {
            createLoginSubmitHandler: (options) => {
                newestState = options.getState;
                return noop;
            },
        },
        "/static/reuse/in-page-callout.js": { renderInPageCallout: () => "" },
        "/static/reuse/auth-footer.js": {
            loadAuthFooterPlugins: async () => {},
            mountAuthFooter: noop,
            renderAuthFooter: () => "",
        },
        "/static/reuse/i18n.js": {
            applyDocumentTitle: noop,
            createI18n: async () => i18n,
        },
        "/static/reuse/page-composer/index.js": {
            createPageComposer: (_root, options) => {
                composerOptions = options;
                return { init: async () => options.elements[0].onRender() };
            },
        },
        "/static/reuse/page-entry.js": {
            beginPageLoading: () => noop,
            mountWhenDirect: async () => {},
        },
        "/static/reuse/escape-html.js": { escapeHtml: String },
        "/static/reuse/form-builder.js": {
            createFormBuilder: () => ({ render: () => "" }),
        },
        "/static/reuse/toast.js": { showToast: noop },
        "/static/reuse/popup.js": { openPopup: async () => {} },
        "/static/reuse/auth-typing.js": {
            loadAuthTypingSamples: async () => [],
            runTypingShowcase: noop,
        },
        "/static/reuse/auth-layout.js": {
            renderAuthBrandline: () => "",
            renderAuthLayout: () => "",
        },
        "./navigation.js": { navigateAfterLogin: async () => {} },
        "/static/reuse/ui-ctx.js": {
            uiCtx: { capabilities: { get: noop }, runFlow: async () => {} },
        },
        "./integrations.js": {
            createLoginIntegrationLoader: () => ({
                loadConfig: async () => ({ methods: [] }),
                loadClient: async (_id, create) =>
                    create({
                        createTfaLoginClient: async ({ root }) => ({
                            async switchToTfaPrompt(payload) {
                                let release;
                                const waiting = new Promise((done) => {
                                    release = done;
                                });
                                gates.push(release);
                                await waiting;
                                root.querySelector("#login-tfa-fields");
                                return payload.loginAttemptId;
                            },
                        }),
                    }),
            }),
        },
        "/static/reuse/error-reporting.js": { reportClientError: noop },
        "./sso-buttons.js": {
            beginSsoLogin: async () => {},
            createSsoLoginButton: noop,
            isStyledSsoMethod: () => false,
        },
        "/static/gateways/auth/login-client.js": { persistLoginSession: noop },
        "./session.js": { clearLoginSession: noop },
        "./client-loaders.js": {
            createLoginClientLoaders,
            createLoginReasonNotifier: () => noop,
            createRouteScopedToast: () => noop,
            isPublicRegistrationEnabled: async () => false,
        },
        "/static/reuse/flow-registry.js": {},
        "/static/adapters/auth/keyring/keyring.js": {},
    };
    const oldFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ data }) });
    try {
        const { mount } = await importTestModule(
            new URL("../../ui/login-page/index.js", import.meta.url),
            imports,
            {
                URL,
                console,
                Element,
                HTMLElement: Element,
                HTMLInputElement: Input,
                document: {
                    querySelector: root.querySelector,
                    querySelectorAll: () => [],
                },
                window: { location: { href: "https://cognis.test/login" } },
                localStorage: { getItem: () => null },
            },
        );
        await mount(root, { signal: new AbortController().signal });
        await new Promise((done) => setImmediate(done));
        assert.equal(gates.length, 1);
        assert.equal(newestState().applyingTfa, true);
        form = new Element();
        composerOptions.elements[0].onRender();
        await new Promise((done) => setImmediate(done));
        assert.equal(gates.length, 2);
        assert.equal(newestState().applyingTfa, true);
        gates[0]();
        await new Promise((done) => setImmediate(done));
        assert.equal(
            newestState().applyingTfa,
            true,
            "older completion must not release newer form busy state",
        );
        gates[1]();
    } finally {
        globalThis.fetch = oldFetch;
    }
});
