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
    assert.match(source, /function renderPopupHeading/);
    assert.match(source, /escapeHtml\(detail\)/);
    assert.match(source, /<h4 class="popup-title-detail"/);
    assert.doesNotMatch(source, /<h2 class="popup-title"[^>]*>[^<]*\$\{detail/);
    assert.match(stylesheet, /\.popup-title-detail/);
    assert.match(
        stylesheet,
        /font-size: calc\(0\.936em \* var\(--popup-title-detail-scale, 1\)\)/,
    );
    assert.match(stylesheet, /font-weight: 400/);
});

test("popup exposes core-owned title actions and body updates", () => {
    assert.match(source, /titleAction/);
    assert.match(source, /class="popup-title-action btn-neutral"/);
    assert.match(source, /function updateBody\(nextBody\)/);
    assert.match(stylesheet, /\.popup-title-action/);
});

test("popup supports leading title content, standard close controls, and action icons", () => {
    assert.match(source, /titleLeading/);
    assert.match(source, /class="popup-heading"/);
    assert.match(source, /popup-close-btn btn-close btn-neutral/);
    assert.match(source, /function renderActionContent/);
    assert.match(source, /class="popup-action-icon/);
    assert.match(stylesheet, /\.popup-heading/);
    assert.match(stylesheet, /\.popup-action-icon--flip/);
});

test("popup typography scales from the user font-size preference", () => {
    assert.match(stylesheet, /\.popup-dialog[\s\S]*font-size: 1rem/);
    assert.match(stylesheet, /\.popup-body[\s\S]*font-size: 1em/);
    assert.match(
        stylesheet,
        /\.popup-body :where\(h3\)[\s\S]*font-size: 1\.5em/,
    );
    assert.match(
        stylesheet,
        /\.popup-title[\s\S]*font-size: calc\(3em \* var\(--popup-title-scale, 1\)\)/,
    );
    assert.doesNotMatch(stylesheet, /font-size\s*:\s*[\d.]+(?:px|pt)\b/);
});

test("popup headings stay on one row and scale detail before title", () => {
    assert.match(source, /function fitPopupTitleRow/);
    assert.match(source, /detailScale > 0\.5/);
    assert.match(source, /titleScale > 0\.7/);
    assert.ok(
        source.indexOf("detailScale > 0.5") <
            source.indexOf("titleScale > 0.7"),
    );
    assert.match(
        source,
        /window\.addEventListener\("resize", fitPopupTitleRow\)/,
    );
    assert.match(source, /document\.fonts\?\.ready\.then\(fitPopupTitleRow\)/);
    assert.match(stylesheet, /\.popup-heading[\s\S]*white-space: nowrap/);
    assert.match(stylesheet, /\.popup-title-detail[\s\S]*white-space: nowrap/);
});
