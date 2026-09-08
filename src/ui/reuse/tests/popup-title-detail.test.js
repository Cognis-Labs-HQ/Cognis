import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const source = readFileSync(resolve(ROOT, "src/ui/reuse/popup.js"), "utf8");
const stylesheet = readFileSync(
    resolve(ROOT, "src/ui/styles/popup.css"),
    "utf8",
);

test("popup title details are escaped and visually subordinate", () => {
    assert.match(source, /function renderPopupTitle/);
    assert.match(source, /escapeHtml\(detail\)/);
    assert.match(source, /class="popup-title-detail"/);
    assert.match(stylesheet, /\.popup-title-detail/);
    assert.match(stylesheet, /font-size: 0\.72em/);
    assert.match(stylesheet, /font-weight: 400/);
});

test("popup exposes core-owned title actions and body updates", () => {
    assert.match(source, /titleAction/);
    assert.match(source, /class="popup-title-action btn-neutral"/);
    assert.match(source, /function updateBody\(nextBody\)/);
    assert.match(stylesheet, /\.popup-title-action/);
});

test("popup typography scales from the user font-size preference", () => {
    assert.match(stylesheet, /\.popup-dialog[\s\S]*font-size: 1rem/);
    assert.match(stylesheet, /\.popup-body[\s\S]*font-size: 1em/);
    assert.match(
        stylesheet,
        /\.popup-body :where\(h3\)[\s\S]*font-size: 1\.5em/,
    );
    assert.doesNotMatch(stylesheet, /font-size\s*:\s*[\d.]+(?:px|pt)\b/);
});
