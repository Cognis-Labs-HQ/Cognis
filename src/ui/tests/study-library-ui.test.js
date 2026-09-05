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

test("Study Library presents layers as tabs and entries as cards", () => {
    assert.match(source, /role="tablist"/);
    assert.match(source, /role="tabpanel"/);
    assert.match(source, /class="library-entry-card btn-neutral"/);
    assert.match(stylesheet, /\.library-entry-grid/);
});

test("Study Library keeps entry identifiers out of visible URLs", () => {
    assert.doesNotMatch(source, /\/study\/library\/\$\{/);
    assert.doesNotMatch(source, /history\.(?:pushState|replaceState)/);
    assert.doesNotMatch(source, /navigateTo/);
    assert.match(source, /button\[data-library-entry\]/);
});

test("Study Library popup uses equal directional navigation controls", () => {
    assert.match(source, /label: `← \$\{i18n\.t/);
    assert.match(source, /i18n\.t\("gateway\.study\.library_next"\)\} →`/);
    assert.match(stylesheet, /flex: 1 1 calc\(50% - 0\.5rem\)/);
});
