import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    createSsoLoginButton,
    isStyledSsoMethod,
} from "../ui/login-page/sso-buttons.js";
import { loadRegistrationConfig, startSsoLogin } from "../ui/login-client.js";

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
            new URL("../ui/login-page/index.css", import.meta.url),
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
        new URL("../../../ui/styles/reuse/layout.css", import.meta.url),
        "utf8",
    );
    assert.match(styles, /\.global-footer-links\s*\{[^}]*flex-wrap:\s*nowrap/s);
    assert.match(
        styles,
        /\.global-footer-link\s*\{[^}]*white-space:\s*nowrap/s,
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

test("auth client owns registration configuration response parsing", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok: true,
        json: async () => ({
            data: {
                registrationsEnabled: true,
                userValidationMode: "email",
                integrations: [
                    { id: "terms", scriptUrl: "/static/terms.js" },
                    { id: "incomplete" },
                ],
            },
        }),
    });
    try {
        assert.deepEqual(await loadRegistrationConfig(), {
            registrationsEnabled: true,
            userValidationMode: "email",
            integrations: [{ id: "terms", scriptUrl: "/static/terms.js" }],
        });
    } finally {
        globalThis.fetch = originalFetch;
    }
});
