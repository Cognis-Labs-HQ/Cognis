import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../../../");
const SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/auth/ui/security-prefs.js"),
    "utf8",
);

test("security preferences render recovery codes as a separate section", () => {
    assert.match(
        SOURCE,
        /<div class="settings-auth-recovery-codes">[\s\S]*id="settings-recovery-codes-btn"/,
    );
    assert.match(
        SOURCE,
        /<div class="settings-language-heading-row">\s*<h3>\$\{i18n\.t\("gateway\.auth\.security\.tfa_preferred_methods"\)\}<\/h3>\s*<\/div>/,
    );
    assert.doesNotMatch(SOURCE, /settings-tfa-recovery-codes-btn/);
});

test("security preferences TFA drag and drop supports row insertion", () => {
    assert.match(SOURCE, /drop-target-before/);
    assert.match(SOURCE, /drop-target-after/);
    assert.match(SOURCE, /insertPreferredMethodId/);
    assert.match(
        SOURCE,
        /nextPreferredMethodIds\.splice\(\s*targetIsAfter \? targetIndex \+ 1 : targetIndex,\s*0,\s*methodId,\s*\)/,
    );
});
