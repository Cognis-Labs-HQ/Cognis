import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createSsoLoginButton } from "../app/login/sso-buttons.js";

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
            "Fallback",
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
