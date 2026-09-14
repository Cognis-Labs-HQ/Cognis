import assert from "node:assert/strict";
import test from "node:test";

import { createSideMenu } from "../side-menu.js";

test("side menu renders structured groups and tracks active items", () => {
    globalThis.localStorage = {
        getItem: () => null,
        setItem: () => undefined,
    };
    const classes = new Set();
    const attributes = new Map();
    const button = {
        dataset: { sideMenuItem: "terms" },
        classList: {
            toggle(name, enabled) {
                if (enabled) classes.add(name);
                else classes.delete(name);
            },
        },
        setAttribute: (name, value) => attributes.set(name, value),
        removeAttribute: (name) => attributes.delete(name),
    };
    const root = { querySelectorAll: () => [button] };
    const menu = createSideMenu({
        groups: [
            {
                id: "legal",
                label: "Legal & Safety",
                items: [{ id: "terms", label: "Terms <Current>" }],
            },
        ],
        storageKeyPrefix: "legal-menu",
    });

    assert.match(menu.render(), /Legal &amp; Safety/);
    assert.match(menu.render(), /Terms &lt;Current&gt;/);
    menu.setActive("terms", root);
    assert.equal(classes.has("active"), true);
    assert.equal(attributes.get("aria-current"), "page");
});

test("side menu validates its structured payload", () => {
    assert.throws(
        () => createSideMenu({ groups: [], storageKeyPrefix: "" }),
        /require groups/,
    );
});
