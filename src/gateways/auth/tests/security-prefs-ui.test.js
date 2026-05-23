import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../../../");
const SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/auth/ui/security-prefs/index.js"),
    "utf8",
);

test("security preferences render recovery codes as a separate section", () => {
    assert.match(
        SOURCE,
        /<div class="settings-auth-recovery-codes">[\s\S]*id="settings-recovery-codes-btn"/,
    );
    assert.match(SOURCE, /id="settings-recovery-codes-toggle-btn"/);
    assert.match(SOURCE, /id="settings-recovery-codes-table"/);
    assert.match(
        SOURCE,
        /<div class="content-grid--two-column">[\s\S]*id="available-tfa-methods"[\s\S]*id="preferred-tfa-methods"/,
    );
    assert.match(SOURCE, /class="settings-tfa-options-grid"/);
    assert.match(SOURCE, /class="settings-tfa-option-label"/);
});

test("security preferences TFA drag and drop supports row insertion", () => {
    assert.match(SOURCE, /drop-target-before/);
    assert.match(SOURCE, /drop-target-after/);
    assert.match(SOURCE, /insertPreferredMethodId/);
    assert.match(
        SOURCE,
        /methodConfigured = Boolean\(methodDetails\?\.configuredAt\)/,
    );
    assert.match(
        SOURCE,
        /nextPreferredMethodIds\.splice\(\s*targetIsAfter \? targetIndex \+ 1 : targetIndex,\s*0,\s*methodId,\s*\)/,
    );
});
