import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { renderStructuredContent } from "../reuse/structured-content.js";

test("structured content applies canonical classes and group dividers", () => {
    const markup = renderStructuredContent([
        {
            id: "first",
            items: [
                { type: "title", text: "First" },
                { type: "subheading", text: "Details" },
                { type: "text", text: "Safe <text>" },
            ],
        },
        {
            id: "second",
            items: [
                { type: "toggle", id: "enabled", checked: true },
                { type: "button", id: "save", text: "Save" },
            ],
        },
    ]);

    assert.match(markup, /structured-content__title/);
    assert.match(markup, /structured-content__subheading/);
    assert.match(markup, /Safe &lt;text&gt;/);
    assert.match(markup, /id="enabled"[^>]*checked/);
    assert.match(markup, /id="save"/);
    assert.equal(
        (markup.match(/structured-content__divider/g) ?? []).length,
        1,
    );
});

test("structured content ignores unknown item types", () => {
    const markup = renderStructuredContent([
        { items: [{ type: "raw-html", text: "<strong>unsafe</strong>" }] },
    ]);

    assert.doesNotMatch(markup, /unsafe/);
});

test("structured content dividers use the softened border tint", () => {
    const styles = readFileSync(
        new URL("../styles/reuse/structured-content.css", import.meta.url),
        "utf8",
    );

    assert.match(styles, /structured-content__divider[\s\S]*color-mix\(/);
    assert.match(styles, /color-border[^;]*55%/);
});
