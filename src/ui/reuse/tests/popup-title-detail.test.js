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
