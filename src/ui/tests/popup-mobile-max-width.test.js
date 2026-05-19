import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("popup skips custom maxWidth on mobile viewports", () => {
    const source = readFileSync(resolve(ROOT, "src/ui/reuse/popup.js"), "utf8");

    assert.match(source, /maxWidth &&/);
    assert.match(source, /matchMedia\("\(max-width: 640px\)"\)\.matches/);
    assert.match(source, /style\.maxWidth = maxWidth;/);
});

test("popup locks page scrolling while preserving popup overflow", () => {
    const popupSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/popup.js"),
        "utf8",
    );
    const stylesSource = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/popup.css"),
        "utf8",
    );

    assert.match(popupSource, /function lockPageScroll\(\)/);
    assert.match(popupSource, /document\.querySelectorAll\("main"\)/);
    assert.match(popupSource, /element\.style\.overflow = "hidden";/);
    assert.match(popupSource, /function unlockPageScroll\(\)/);
    assert.match(stylesSource, /\.popup-overlay \{[\s\S]*overflow-y: auto;/);
    assert.match(
        stylesSource,
        /@media \(max-width: 640px\) \{[\s\S]*\.popup-overlay \{[\s\S]*align-items: flex-start;[\s\S]*padding: 12px;/,
    );
});
