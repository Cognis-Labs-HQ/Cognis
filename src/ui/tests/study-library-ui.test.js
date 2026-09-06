import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const source = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app.js"),
    "utf8",
);
const stylesheet = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/library.css"),
    "utf8",
);

test("Study Library presents browsable layers as filterable card tabs", () => {
    assert.match(source, /role="tablist"/);
    assert.match(source, /role="tabpanel"/);
    assert.match(source, /class="library-entry-card btn-neutral"/);
    assert.match(source, /select class="theme-select" data-library-filter=/);
    assert.match(source, /addEventListener\("input", handleFilterSelection/);
    assert.match(stylesheet, /\.library-entry-grid/);
    assert.match(stylesheet, /\.library-filters/);
});

test("Study Library integrates definitions and particles into item details", () => {
    assert.match(source, /function isMeaningLayer/);
    assert.match(source, /layer\.semanticRole !== "particle"/);
    assert.match(source, /class="library-detail-summary"/);
    assert.match(source, /class="library-component-box btn-neutral"/);
    assert.match(source, /layer\?\.semanticRole === "particle"/);
    assert.match(source, /const components = references\.filter/);
});

test("Study Library renders metadata and scope indicators", () => {
    assert.match(source, /detail\?\.renderer === "badge"/);
    assert.match(source, /class="library-metadata-pill"/);
    assert.match(source, /class="library-scope"/);
    assert.match(stylesheet, /\.library-metadata-pill/);
});

test("Study Library popup uses equal directional navigation controls", () => {
    assert.match(source, /label: `← \$\{i18n\.t/);
    assert.match(source, /i18n\.t\("gateway\.study\.library_next"\)\} →`/);
    assert.match(stylesheet, /flex: 1 1 calc\(50% - 0\.5rem\)/);
});
