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
const KEYRING_SETTINGS_STYLES = readFileSync(
    resolve(ROOT, "src/gateways/auth/ui/keyring-settings.css"),
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
    assert.match(KEYRING_SETTINGS_SOURCE, /createKeyringScope/);
    assert.match(KEYRING_SETTINGS_SOURCE, /deleteKeyringValue/);
    assert.match(KEYRING_SETTINGS_SOURCE, /alwaysPrompt:\s*true/);
    assert.match(KEYRING_SETTINGS_SOURCE, /type="password"/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-table/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-info/);
    assert.match(KEYRING_SETTINGS_SOURCE, /unlockKeyring/);
    assert.match(KEYRING_SETTINGS_SOURCE, /lockKeyring/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-relock/);
    assert.match(KEYRING_SETTINGS_SOURCE, /requestPasswordConfirmation/);
    assert.match(KEYRING_SETTINGS_SOURCE, /keyring-settings\.css/);
    assert.match(KEYRING_SETTINGS_SOURCE, /data-keyring-expand/);
    assert.match(KEYRING_SETTINGS_SOURCE, /renderSecretVisibilityField/);
    assert.match(KEYRING_SETTINGS_SOURCE, /bindSecretVisibilityToggles/);
    assert.match(KEYRING_SETTINGS_SOURCE, /class="theme-select"/);
    assert.match(
        KEYRING_SETTINGS_SOURCE,
        /!isKeyringUnlocked\(\) && \(await promptToUnlock\(\)\)/,
    );
    assert.match(KEYRING_SETTINGS_STYLES, /tbody\.is-locked/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-obscured/);
    assert.match(KEYRING_SETTINGS_SOURCE, /if \(!unlocked\)/);
    assert.doesNotMatch(KEYRING_SETTINGS_SOURCE, /keyring-unlock-password/);
    assert.doesNotMatch(
        KEYRING_SETTINGS_SOURCE,
        /settings-keyring-relock"\$\{unlocked \? "" : " disabled"\}/,
    );
    assert.doesNotMatch(SOURCE, /settings-keyring-relock/);
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
