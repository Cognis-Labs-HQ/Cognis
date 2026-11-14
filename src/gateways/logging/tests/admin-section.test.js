import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("logging admin section prepends newer log rows and keeps timestamps precise", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/logging/ui/admin-section.js"),
        "utf8",
    );

    assert.match(source, /logs\.unshift\(entry\)/);
    assert.match(source, /logs\.pop\(\)/);
    assert.match(source, /pendingEntries\.unshift\(entry\)/);
    assert.match(source, /resultsEl\.prepend\(fragment\)/);
    assert.match(source, /resultsEl\.lastElementChild\?\.remove\(\)/);
    assert.match(source, /severity:\s*"warn"/);
    assert.match(source, /formatDateTime\(\s*entry\.ts,/);
    assert.match(source, /i18n\.t\("ui\.app\.admin\.logs\.time_unknown"\)/);
    assert.match(source, /includeSeconds: true/);
});
