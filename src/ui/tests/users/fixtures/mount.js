import assert from "node:assert/strict";
import { importTestModule } from "../../../../tooling/reuse/test-module.ts";
import * as roles from "../../../reuse/access-role.js";
import { escapeHtml } from "../../../reuse/escape-html.js";
import { createCollapsibleSectionComposer } from "../../../reuse/collapsible-section-composer.js";

export async function mountUsers(options = {}) {
    const external = options.external ?? false;
    let clicked,
        markup = "";
    const menus = [];
    const notices = [];
    const handlers = new Map();
    let reads = 0;
    let refreshes = 0;
    const user = options.user ?? {
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
    const roleControl = {
        dataset: { username: user.accountId },
        value: "teacher",
        addEventListener: (type, handler) =>
            handlers.set(`role:${type}`, handler),
    };
    const details = {
        dataset: { userDetails: user.accountId },
        open: true,
        isConnected: true,
        querySelector: () => ({ addEventListener() {} }),
        addEventListener: (type, handler) =>
            handlers.set(`details:${type}`, handler),
    };
    const root = {
        querySelectorAll: (selector) =>
            selector === ".users-menu-btn"
                ? [button]
                : selector === ".users-role-select"
                  ? [roleControl]
                  : selector === "[data-user-details]"
                    ? [details]
                    : [],
    };
    const { mount } = await importTestModule(
        new URL("../../../app/users/index.js", import.meta.url),
        {
            "../../reuse/page-styles.js": {
                ensurePageStylesheet: async () => {},
            },
            "../../reuse/collapsible-section-composer.js": {
                createCollapsibleSectionComposer,
            },
            "./details.js": {
                createUserDetailsReader: () =>
                    options.readDetails ??
                    (() =>
                        assert.fail("menu does not load account disclosures")),
            },
            "../../reuse/api-client.js": {
                apiFetch: async (path, request) => {
                    if (path === "/api/v1/users") {
                        reads++;
                        return options.readUsers
                            ? options.readUsers(reads)
                            : Response.json({ data: [user] });
                    }
                    assert.equal(path, `/api/v1/users/${user.accountId}/role`);
                    assert.equal(request.method, "POST");
                    return Response.json({ data: { updated: true } });
                },
            },
            "../../reuse/i18n.js": {
                createI18n: async () => ({ t: (key) => key }),
                applyDocumentTitle() {},
            },
            "../../reuse/page-composer/index.js": {
                createPageComposer: (_root, options) => ({
                    refresh: () => {
                        refreshes++;
                    },
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
                openPopup: () => assert.fail("menu requires no confirmation"),
            },
            "../../reuse/escape-html.js": { escapeHtml },
            "../../reuse/toast.js": {
                showToast: (message, settings) =>
                    notices.push({ message, ...settings }),
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
                getItem: (key) =>
                    key === "cognis_role"
                        ? "owner"
                        : key === "cognis_account"
                          ? (options.accountId ?? "u_other")
                          : key === "cognis_access_token"
                            ? "opaque-token-with-no-jwt-claims"
                            : null,
            },
            HTMLButtonElement: Button,
        },
    );
    await mount(root, { signal: new AbortController().signal });
    return {
        user,
        menus,
        notices,
        handlers,
        button,
        markup,
        clicked: () => clicked(),
        refreshes: () => refreshes,
    };
}
