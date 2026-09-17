import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    createSsoLoginButton,
    isStyledSsoMethod,
} from "../app/login/sso-buttons.js";
import { reportLoginError } from "../app/login/error-reporting.js";
import { startSsoLogin } from "../../gateways/auth/ui/login-client.js";
import {
    readAccountCreationAuthorization,
    renderAccountCreationAuthorization,
} from "../../gateways/auth/ui/registration-authorization.js";

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.classList = {
            add: (...names) => {
                this.className = [this.className, ...names]
                    .filter(Boolean)
                    .join(" ");
            },
        };
        this.style = {
            values: new Map(),
            setProperty: (property, value) => {
                this.style.values.set(property, value);
            },
        };
        this.listeners = new Map();
    }

    append(...children) {
        this.children.push(...children);
    }

    addEventListener(name, listener) {
        this.listeners.set(name, listener);
    }

    setAttribute(name, value) {
        this[name] = value;
    }
}

test("branded SSO buttons retain their icon and full label", async () => {
    const originalDocument = globalThis.document;
    globalThis.document = {
        createElement: (tagName) => new FakeElement(tagName),
    };
    try {
        let selected = false;
        const button = createSsoLoginButton(
            {
                loginButton: {
                    label: "Continue with X",
                    iconUrl: "/static/modules/x-sso/x.svg",
                    backgroundColor: "#ffffff",
                    borderColor: "#d8d8d8",
                    textColor: "#202124",
                },
            },
            () => {
                selected = true;
            },
        );

        assert.match(button.className, /sso-login-btn--branded/);
        assert.equal(button.children[0].src, "/static/modules/x-sso/x.svg");
        assert.equal(button.children[1].textContent, "Continue with X");
        assert.equal(
            button.style.values.get("--sso-button-background"),
            "#ffffff",
        );
        button.listeners.get("click")();
        assert.equal(selected, true);

        const styles = await readFile(
            new URL("../styles/login.css", import.meta.url),
            "utf8",
        );
        assert.match(
            styles,
            /\.sso-login-btn--branded\s*\{[^}]*width:\s*100%/s,
        );
        assert.doesNotMatch(
            styles,
            /@media[^}]*sso-login-btn__label[^}]*display:\s*none/s,
        );
    } finally {
        globalThis.document = originalDocument;
    }
});

test("plain SSO methods are excluded from login button rendering", () => {
    assert.equal(
        isStyledSsoMethod({ id: "plain", name: "Plain Provider" }),
        false,
    );
    assert.equal(
        isStyledSsoMethod({
            id: "styled",
            loginButton: {
                label: "Continue with Styled Provider",
                iconUrl: "/static/modules/styled/icon.svg",
            },
        }),
        true,
    );
});

test("authentication footer links remain on one content-width row", async () => {
    const styles = await readFile(
        new URL("../styles/login.css", import.meta.url),
        "utf8",
    );
    assert.match(
        styles,
        /\.auth-footer \[data-footer-links\][^{]*\{[^}]*flex:\s*0 0 auto[^}]*flex-wrap:\s*nowrap[^}]*width:\s*max-content/s,
    );
    assert.match(
        styles,
        /\.auth-footer \.global-footer-link\s*\{[^}]*white-space:\s*nowrap/s,
    );
});

test("SSO initiation requests provider authorization without credentials", async () => {
    const originalFetch = globalThis.fetch;
    let request;
    globalThis.fetch = async (url, options) => {
        request = { url, options };
        return {
            ok: true,
            json: async () => ({
                data: { redirectUrl: "https://identity.example.com/authorize" },
            }),
        };
    };
    try {
        assert.equal(
            await startSsoLogin("x-sso"),
            "https://identity.example.com/authorize",
        );
        assert.equal(request.url, "/api/v1/auth/sso/start");
        assert.deepEqual(JSON.parse(request.options.body), {
            providerId: "x-sso",
        });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("anonymous login failures do not call the authenticated logger", () => {
    const originalConsoleError = console.error;
    const calls = [];
    console.error = (...args) => calls.push(args);
    try {
        reportLoginError({
            providerId: "x-sso",
            error: "SSO provider rejected the request.",
        });
        assert.equal(calls.length, 1);
        assert.equal(calls[0][0].providerId, "x-sso");
        assert.equal(calls[0][0].error, "SSO provider rejected the request.");
    } finally {
        console.error = originalConsoleError;
    }
});

test("SSO account creation carries its lease into the composed token form", async () => {
    const request = readAccountCreationAuthorization({
        emailRequired: false,
        expiresAt: 1893456000000,
    });
    assert.deepEqual(request, {
        active: true,
        emailRequired: false,
        expiresAt: 1893456000000,
    });

    const authorizationSource = await readFile(
        new URL(
            "../../adapters/registration/token/ui/authorization.js",
            import.meta.url,
        ),
        "utf8",
    );
    assert.match(authorizationSource, /createFormBuilder/);
    assert.match(authorizationSource, /account-creation-countdown/);
    assert.match(authorizationSource, /formatCountdownClock/);

    const styles = await readFile(
        new URL("../styles/login.css", import.meta.url),
        "utf8",
    );
    assert.match(styles, /\.auth-countdown-pill\s*\{/);
});

test("SSO account creation only requests an email when one is required", async () => {
    const renderRequests = [];
    const integrations = [
        {
            i18n: {},
            module: {
                renderAccountCreationAuthorization(request) {
                    renderRequests.push(request);
                    return "<form></form>";
                },
            },
        },
    ];

    renderAccountCreationAuthorization({
        integrations,
        request: {
            active: true,
            emailRequired: false,
            expiresAt: 1893456000000,
        },
        escapeHtml: String,
    });
    renderAccountCreationAuthorization({
        integrations,
        request: {
            active: true,
            emailRequired: true,
            expiresAt: 1893456000000,
        },
        escapeHtml: String,
    });

    assert.deepEqual(
        renderRequests.map(({ emailRequired }) => emailRequired),
        [false, true],
    );

    const authorizationSource = await readFile(
        new URL(
            "../../adapters/registration/token/ui/authorization.js",
            import.meta.url,
        ),
        "utf8",
    );
    assert.match(authorizationSource, /\.\.\.\(emailRequired/);
    assert.match(
        authorizationSource,
        /name: "email"[\s\S]*?type: "email"[\s\S]*?required: true/,
    );
});
