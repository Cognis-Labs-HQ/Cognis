import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(
    new URL("../ui/verify-email.html", import.meta.url),
    "utf8",
);
const script = readFileSync(
    new URL("../ui/verify-email.js", import.meta.url),
    "utf8",
);
const styles = readFileSync(
    new URL("../ui/verify-email.css", import.meta.url),
    "utf8",
);

test("email verification uses the Cognis theme surface", () => {
    assert.match(html, /\/static\/styles\/reuse\/theme\.css/);
    assert.match(script, /applyTheme\(getStoredTheme\(\)\)/);
    assert.match(styles, /background: var\(--surface\)/);
    assert.match(styles, /color: var\(--text-muted\)/);
});

test("successful email verification animates the tick once", () => {
    assert.match(script, /classList\.add\("verify-icon-success"\)/);
    assert.match(styles, /\.verify-icon-success\s*{[\s\S]*animation:/);
    assert.doesNotMatch(styles, /verify-tick-arrive[^;]*infinite/);
    assert.match(styles, /prefers-reduced-motion: reduce/);
});
