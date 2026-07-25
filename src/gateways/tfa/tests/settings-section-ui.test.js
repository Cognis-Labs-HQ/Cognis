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
    assert.doesNotMatch(
        SOURCE,
        /showToast\(\s*i18n\.t\("gateway\.tfa\.settings\.method_moved_available"\)/,
    );
});

test("tfa settings require password confirmation before removing enabled methods", () => {
    assert.match(SOURCE, /createRepromptGuard\(\{ i18n \}\)/);
    assert.match(
        SOURCE,
        /const removesEnabledMethod = \[\.\.\.currentEnabledIds\]\.some\([\s\S]*?if \(removesEnabledMethod\) \{[\s\S]*?reprompt\.runWithReprompt/,
    );
    assert.match(SOURCE, /if \(!confirmed\) return;/);
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
        /primary_email_required:\s*"ui\.app\.settings\.notif_smtp_no_email_body"/,
    );
    assert.match(
        SOURCE,
        /primary_email_address_not_verified:\s*"ui\.app\.settings\.notif_smtp_no_email_body"/,
    );
    assert.match(
        SOURCE,
        /invalid_smtp_code:\s*"ui\.app\.login\.tfa\.error_invalid"/,
    );
    assert.match(
        SOURCE,
        /tfa_method_enable_failed:\s*"gateway\.tfa\.settings\.setup_failed"/,
    );
    assert.match(
        SOURCE,
        /tfa_preferences_not_confirmed:\s*"gateway\.tfa\.settings\.setup_failed"/,
    );
    assert.match(
        SOURCE,
        /showToast\(resolveTranslatedTfaErrorMessage\(setup\?\.errorMessage\),/,
    );
    assert.match(
        SOURCE,
        /variant: resolveTfaErrorToastVariant\(setup\?\.errorMessage\)/,
    );
    assert.match(
        SOURCE,
        /const warningCodes = new Set\(\[\s*"primary_email_required",\s*"primary_email_address_not_verified",/,
    );
});

test("configured method popup uses non-secret prompt when no QR data exists", () => {
    assert.match(
        SOURCE,
        /gateway\.tfa\.settings\.method_manage_prompt_no_secret/,
    );
    assert.match(SOURCE, /qrImage\.src \|\| manualSecret/);
});

test("tfa activation only enables methods that were previously configured", () => {
    assert.match(SOURCE, /if \(method\?\.configuredAt\)/);
    assert.match(SOURCE, /return enableMethod\(method\.id\);/);
    assert.match(SOURCE, /return runTfaSetupFlow\(method\.id\);/);
});

test("tfa save removes failed activation methods from preferred targets", () => {
    assert.match(SOURCE, /for \(const id of \[\.\.\.workingPreferredIds\]\)/);
    assert.match(
        SOURCE,
        /const activated = await activateMethod\(method\);\s*if \(!activated\)/,
    );
    assert.match(
        SOURCE,
        /const preferredIndex =\s*workingPreferredIds\.indexOf\(id\);/,
    );
    assert.match(SOURCE, /workingPreferredIds\.splice\(preferredIndex,\s*1\)/);
    assert.doesNotMatch(SOURCE, /tfa_method_setup_incomplete/);
});

test("available TFA rows use configuration-aware activation", () => {
    assert.match(SOURCE, /const method = getAllUniqueMethods\(\)\.find/);
    assert.match(
        SOURCE,
        /const activated = await activateMethod\(method\);\s*if \(!activated\) return;/,
    );
});

test("tfa setup conceals manual secrets behind reusable visibility toggles", () => {
    assert.match(
        SOURCE,
        /from "\/static\/reuse\/secret-visibility-toggle\.js"/,
    );
    assert.match(SOURCE, /renderSecretVisibilityField/);
    assert.match(SOURCE, /bindSecretVisibilityToggles\(\{ root: overlay \}\)/);
    assert.match(SOURCE, /gateway\.tfa\.settings\.manual_secret_toggle/);
    assert.doesNotMatch(SOURCE, /<code class="settings-tfa-setup-code">/);
});
