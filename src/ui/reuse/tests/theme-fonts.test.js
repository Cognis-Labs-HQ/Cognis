import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

test("theme application completes while optional web fonts remain pending", () => {
    const requested = [];
    const attributes = new Map();
    const events = [];
    const { applyTheme } = loadTestModule(
        new URL("../theme-toggle.js", import.meta.url),
        {
            "./page-styles.js": {
                ensurePersistentStylesheet: (href) => {
                    requested.push(href);
                    return new Promise(() => {});
                },
            },
        },
        {
            document: {
                body: {
                    setAttribute: (name, value) => attributes.set(name, value),
                },
                querySelector: () => null,
            },
            window: { dispatchEvent: (event) => events.push(event.type) },
            CustomEvent: class {
                constructor(type) {
                    this.type = type;
                }
            },
        },
    );
    applyTheme("light");
    assert.equal(attributes.get("data-theme"), "light");
    assert.deepEqual(events, ["cognis:themechange"]);
    assert.deepEqual(requested, ["/static/styles/fonts.css"]);
});
