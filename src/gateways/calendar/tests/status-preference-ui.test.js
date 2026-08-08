import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("../ui/status-prefs.js", import.meta.url),
    "utf8",
);

test("calendar status updates use an enabled-by-default switch", () => {
    assert.match(source, /let savedAllowed = true/);
    assert.match(source, /checked: true/);
    assert.match(source, /saveStatusPreference\(!pendingAllowed\)/);
    assert.match(source, /const content = \[/);
    assert.match(source, /type: "title"/);
    assert.match(source, /type: "toggle"/);
    assert.match(source, /status_updates_hint/);
    assert.doesNotMatch(source, /renderContent/);
    assert.doesNotMatch(source, /switch--inline/);
    assert.doesNotMatch(source, /type="radio"/);
});
