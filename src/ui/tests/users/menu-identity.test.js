import assert from "node:assert/strict";
import test from "node:test";
import { importTestModule } from "../../../tooling/reuse/test-module.ts";
import * as roles from "../../reuse/access-role.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { createCollapsibleSectionComposer } from "../../reuse/collapsible-section-composer.js";

for (const external of [true, false]) {
    test(`Users menus resolve ${external ? "SSO" : "local"} policy flags through immutable account IDs`, async () => {
        let clicked,
            markup = "";
        const menus = [];
        const user = {
            accountId: "u_opaque",
            username: "public-name",
            provider: external ? "oidc" : "local",
            role: "user",
            enabled: true,
            isFounder: external,
            hasTfaConfigured: external,
        };
        class Button {
            dataset = { username: user.accountId };
            addEventListener(_type, handler) {
                clicked = handler;
            }
        }
        const button = new Button();
        const root = {
            querySelectorAll: (selector) =>
                selector === ".users-menu-btn" ? [button] : [],
        };
        const { mount } = await importTestModule(
            new URL("../../app/users/index.js", import.meta.url),
            {
                "../../reuse/page-styles.js": {
                    ensurePageStylesheet: async () => {},
                },
                "../../reuse/collapsible-section-composer.js": {
                    createCollapsibleSectionComposer,
                },
                "./details.js": {
                    createUserDetailsReader: () => () =>
                        assert.fail("menu does not load account disclosures"),
                },
                "../../reuse/api-client.js": {
                    apiFetch: async (path) => {
                        assert.equal(path, "/api/v1/users");
                        return Response.json({ data: [user] });
                    },
                },
                "../../reuse/i18n.js": {
                    createI18n: async () => ({ t: (key) => key }),
                    applyDocumentTitle() {},
                },
                "../../reuse/page-composer/index.js": {
                    createPageComposer: (_root, options) => ({
                        init: async () => {
                            markup = options.elements[0].render();
                            options.onRender();
                        },
                    }),
                },
                "../../reuse/page-entry.js": {
                    mountWhenDirect: async () => {},
                },
                "../../reuse/popup.js": {
                    openPopup: () =>
                        assert.fail("menu requires no confirmation"),
                },
                "../../reuse/escape-html.js": { escapeHtml },
                "../../reuse/toast.js": {
                    showToast: () => assert.fail("menu requires no toast"),
                },
                "/static/gateways/auth/reuse/password-confirmation.js": {
                    createRepromptGuard: () => () =>
                        assert.fail("menu requires no password"),
                },
                "/static/gateways/auth/login-client.js": {
                    loadLoginMethods: async () => [],
                },
                "../../reuse/hamburger-menu.js": {
                    openHamburgerMenu: async (_button, { items }) => {
                        menus.push(items);
                        return null;
                    },
                },
                "../../reuse/ui-ctx.js": {
                    uiCtx: { capabilities: { get: () => undefined } },
                },
                "../../reuse/access-role.js": roles,
            },
            {
                localStorage: {
                    getItem: (key) => (key === "cognis_role" ? "owner" : null),
                },
                HTMLButtonElement: Button,
            },
        );
        await mount(root, { signal: new AbortController().signal });
        assert.match(markup, /data-username="u_opaque"/);
        assert.match(markup, />public-name</);
        await clicked();
        const items = menus[0];
        assert.equal(items[0].id, external ? "unset-founder" : "set-founder");
        assert.equal(
            items.find(({ id }) => id === "password").disabled,
            external,
        );
        assert.equal(
            items.some(({ id }) => id === "tfa-reset"),
            external,
        );
        button.dataset.username = user.username;
        await clicked();
        assert.equal(menus.length, 1);
    });
}
