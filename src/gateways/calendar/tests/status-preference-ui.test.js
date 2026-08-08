import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("../ui/status-prefs.js", import.meta.url),
    "utf8",
);

test("calendar status updates use an enabled-by-default switch", () => {
    assert.match(source, /let savedAllowed = true/);
    assert.match(source, /type="checkbox" checked/);
    assert.match(source, /saveStatusPreference\(!pendingAllowed\)/);
    assert.match(source, /<h3>[^]*class="switch"[^]*class="slider"/);
    assert.doesNotMatch(source, /switch--inline/);
    assert.doesNotMatch(source, /type="radio"/);
});
