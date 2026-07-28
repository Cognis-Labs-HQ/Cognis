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
const PASSWORD_CHANGE_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/auth/ui/security-prefs/password-change.js"),
    "utf8",
);
const KEYRING_SETTINGS_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/auth/ui/keyring-settings.js"),
    "utf8",
);

test("auth security preferences disable password reset for external users", () => {
    assert.match(SOURCE, /settings-auth-password-reset/);
    assert.match(SOURCE, /settings-reset-password-btn/);
    assert.doesNotMatch(SOURCE, /settings-auth-recovery-codes/);
    assert.doesNotMatch(SOURCE, /available-tfa-methods/);
    assert.doesNotMatch(SOURCE, /preferred-tfa-methods/);
    assert.match(SOURCE, /unsupported = capability\.supported !== true/);
    assert.match(SOURCE, /unsupported \? " disabled"/);
    assert.match(SOURCE, /external_password_notice/);
});

test("keyring settings require password confirmation for secret changes", () => {
    assert.match(KEYRING_SETTINGS_SOURCE, /listKeyringEntries/);
    assert.match(KEYRING_SETTINGS_SOURCE, /setKeyringValue/);
    assert.match(KEYRING_SETTINGS_SOURCE, /deleteKeyringValue/);
    assert.match(KEYRING_SETTINGS_SOURCE, /alwaysPrompt:\s*true/);
    assert.match(KEYRING_SETTINGS_SOURCE, /type="password"/);
});

test("password change popup revalidates confirm password reactively", () => {
    assert.match(
        PASSWORD_CHANGE_SOURCE,
        /bindConfirmPasswordRevalidation\(\{\s*form:\s*formElement,\s*formController,\s*passwordFieldName:\s*"nextPassword",\s*confirmFieldName:\s*"confirmPassword",/m,
    );
    assert.match(
        PASSWORD_CHANGE_SOURCE,
        /messageKey:\s*"ui\.app\.register\.passwords_match"/,
    );
});
