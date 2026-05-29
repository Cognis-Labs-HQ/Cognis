import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../../../");
const SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/tfa/ui/settings-section.js"),
    "utf8",
);

test("tfa settings render recovery codes as a separate section", () => {
    assert.match(
        SOURCE,
        /<div class="settings-auth-recovery-codes">[\s\S]*id="settings-recovery-codes-btn"/,
    );
    assert.match(SOURCE, /id="settings-recovery-codes-toggle-btn"/);
    assert.match(SOURCE, /id="settings-recovery-codes-table"/);
    assert.match(
        SOURCE,
        /content-grid--two-column[\s\S]*id="available-tfa-methods"[\s\S]*id="preferred-tfa-methods"/,
    );
    assert.match(SOURCE, /class="language-table"/);
    assert.match(SOURCE, /class="drag-handle"/);
});

test("tfa settings drag and drop uses dirty tracker", () => {
    assert.match(SOURCE, /drop-target-before/);
    assert.match(SOURCE, /drop-target-after/);
    assert.match(SOURCE, /insertPreferredMethodId/);
    assert.match(SOURCE, /pendingPreferredIds/);
    assert.match(SOURCE, /isDirtyTfa/);
    assert.match(
        SOURCE,
        /nextPreferredMethodIds\.splice\(\s*targetIsAfter \? targetIndex \+ 1 : targetIndex,\s*0,\s*methodId,\s*\)/,
    );
});

test("tfa required setup popup is guarded against duplicate concurrent flows", () => {
    assert.match(SOURCE, /let requiredSetupPromptActive = false;/);
    assert.match(
        SOURCE,
        /if \(enforcingTfaSetup \|\| requiredSetupPromptActive\) return;/,
    );
    assert.match(SOURCE, /requiredSetupPromptActive = true;/);
    assert.match(SOURCE, /requiredSetupPromptActive = false;/);
});

test("tfa setup maps smtp setup failures to user-facing toast messages", () => {
    assert.match(
        SOURCE,
        /smtp_unavailable:\s*"ui\.app\.settings\.emails_verify_unavailable"/,
    );
    assert.match(
        SOURCE,
        /showToast\(resolveTranslatedTfaErrorMessage\(setup\?\.errorMessage\),/,
    );
});
