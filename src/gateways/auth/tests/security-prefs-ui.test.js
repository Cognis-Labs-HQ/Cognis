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
const STYLES = readFileSync(
    resolve(ROOT, "src/gateways/auth/ui/security-prefs/index.css"),
    "utf8",
);
const PASSWORD_CHANGE_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/auth/ui/security-prefs/password-change.js"),
    "utf8",
);
const PASSWORD_CONFIRMATION_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/auth/ui/reuse/password-confirmation.js"),
    "utf8",
);

test("password confirmation invalidation requires an account session", () => {
    assert.match(
        PASSWORD_CONFIRMATION_SOURCE,
        /session:isAuthenticated[\s\S]*!== true[\s\S]*return true[\s\S]*method: "DELETE"/,
    );
});
const SESSION_FLOW_SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/auth/ui/session-flow-hooks.js"),
    "utf8",
);
const KEYRING_SETTINGS_SOURCE = readFileSync(
    resolve(ROOT, "src/adapters/auth/keyring/ui/settings.js"),
    "utf8",
);
const KEYRING_RELOCK_SOURCE = readFileSync(
    resolve(ROOT, "src/adapters/auth/keyring/ui/relock-options.js"),
    "utf8",
);
const KEYRING_SETTINGS_STYLES = readFileSync(
    resolve(ROOT, "src/adapters/auth/keyring/ui/settings.css"),
    "utf8",
);

test("auth gateway exposes authenticated session state through ui ctx", () => {
    assert.match(
        SESSION_FLOW_SOURCE,
        /capabilities\.contribute\(\s*"session:isAuthenticated"/,
    );
    assert.match(
        SESSION_FLOW_SOURCE,
        /Boolean\(localStorage\.getItem\("cognis_access_token"\)\)[\s\S]*Boolean\(localStorage\.getItem\("cognis_account"\)\)[\s\S]*!isGuestSession\(\)/,
    );
});

test("auth security preferences disable password reset for external users", () => {
    assert.match(SOURCE, /class="components-section"/);
    assert.match(SOURCE, /class="components-section-heading"/);
    assert.match(SOURCE, /class="components-section-body"/);
    assert.match(SOURCE, /settings-auth-password-reset/);
    assert.match(SOURCE, /settings-reset-password-btn/);
    assert.doesNotMatch(SOURCE, /settings-auth-recovery-codes/);
    assert.doesNotMatch(SOURCE, /available-tfa-methods/);
    assert.doesNotMatch(SOURCE, /preferred-tfa-methods/);
    assert.match(SOURCE, /unsupported = capability\.supported !== true/);
    assert.match(SOURCE, /unsupported \? " disabled"/);
    assert.match(SOURCE, /external_password_notice/);
});

test("auth security preferences present login timeout as a subsection", () => {
    assert.match(
        SOURCE,
        /<h3 class="components-section-heading">\$\{escapeHtml\(i18n\.t\("gateway\.auth\.security\.session_timeout_label"\)\)\}<\/h3>/,
    );
    assert.match(SOURCE, /settings-login-session-timeout-unit/);
    assert.match(SOURCE, /components-section settings-auth-password-reset/);
});

test("auth security preferences register timeout changes by dirty key", () => {
    assert.match(SOURCE, /LOGIN_SESSION_TIMEOUT_DIRTY_KEY/);
    assert.match(
        SOURCE,
        /markDirty\?\.\(\s*LOGIN_SESSION_TIMEOUT_DIRTY_KEY,\s*usesDefaultSessionTimeout !== originalUsesDefaultSessionTimeout \|\|\s*getTimeoutMinutes\(\) !== originalSessionTimeoutMinutes,/,
    );
    assert.match(SOURCE, /syncLoginSessionTimeoutDirtyState/);
});

test("auth security preferences can reset to the administration default", () => {
    assert.match(SOURCE, /settings-login-session-timeout-reset/);
    assert.match(SOURCE, /<svg viewBox="0 0 24 24"/);
    assert.match(SOURCE, /usesDefaultSessionTimeout = true/);
    assert.match(SOURCE, /\{ useDefault: true \}/);
    assert.match(SOURCE, /latestTimeout\.maximumMinutes/);
    assert.match(SOURCE, /resetLoginSessionTimeoutToGlobal/);
    assert.match(
        SOURCE,
        /aria-label="\$\{escapeHtml\(i18n\.t\("gateway\.auth\.security\.session_timeout_reset"\)\)\}">/,
    );
});

test("auth security preferences show a non-selectable Never default", () => {
    assert.match(
        SOURCE,
        /<option value="never" selected disabled>.*session_timeout_never/,
    );
    assert.match(
        SOURCE,
        /input\.hidden = sessionTimeout\?\.maximumMinutes === 0/,
    );
});

test("auth security preferences show the current session countdown", () => {
    assert.match(SOURCE, /cognis_session_expires_at/);
    assert.match(SOURCE, /getCountdownParts\(remaining\)/);
    assert.match(SOURCE, /settings-login-session-timeout-countdown/);
    assert.match(SOURCE, /!timeoutDisabled && hasSessionExpiry/);
    assert.match(SOURCE, /cognis_login_time/);
    assert.match(SOURCE, /syncCountdownUrgency\(countdown, remaining\)/);
    assert.match(SOURCE, /window\.setInterval\(updateCountdown, 1000\)/);
    assert.match(SOURCE, /getCountdownUrgency\(remaining, sessionDuration\)/);
    assert.match(
        STYLES,
        /#settings-login-session-timeout-countdown\.session-expiry-countdown--warning/,
    );
    assert.match(
        STYLES,
        /#settings-login-session-timeout-countdown\.session-expiry-countdown--danger/,
    );
    assert.match(STYLES, /session-expiry-countdown--warning/);
    assert.match(STYLES, /session-expiry-countdown--danger/);
});

test("longer session preferences defer until the next login", () => {
    assert.match(SOURCE, /payload\.data\?\.appliesOnNextLogin === true/);
    assert.match(SOURCE, /session_timeout_next_login/);
    assert.match(SOURCE, /variant: "warning"/);
});

test("keyring settings unlock once before allowing secret changes", () => {
    assert.match(KEYRING_SETTINGS_SOURCE, /listKeyringEntries/);
    assert.match(KEYRING_SETTINGS_SOURCE, /createKeyringScope/);
    assert.match(KEYRING_SETTINGS_SOURCE, /deleteKeyringValue/);
    assert.match(KEYRING_SETTINGS_SOURCE, /requestKeyringUnlock/);
    assert.match(KEYRING_SETTINGS_SOURCE, /request_action_manage/);
    assert.match(KEYRING_SETTINGS_SOURCE, /request_process_stored_secrets/);
    assert.doesNotMatch(KEYRING_SETTINGS_SOURCE, /runWithReprompt/);
    assert.match(KEYRING_SETTINGS_SOURCE, /type="password"/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-table/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-info/);
    assert.match(KEYRING_SETTINGS_SOURCE, /renderInfoTooltip/);
    assert.match(
        KEYRING_RELOCK_SOURCE,
        /\[5, "gateway\.auth\.keyring\.timeout_5_minutes"\]/,
    );
    assert.match(
        KEYRING_RELOCK_SOURCE,
        /\[10080, "gateway\.auth\.keyring\.timeout_1_week"\]/,
    );
    assert.match(
        KEYRING_SETTINGS_SOURCE,
        /id: "clear",[\s\S]*variant: "cancel"/,
    );
    assert.match(
        KEYRING_SETTINGS_SOURCE,
        /id: "cancel",[\s\S]*variant: "neutral"/,
    );
    assert.match(KEYRING_SETTINGS_SOURCE, /lockKeyring/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-relock/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-change-password/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-clear/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-log/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings-keyring-section/);
    assert.match(KEYRING_SETTINGS_SOURCE, /data-keyring-log-previous/);
    assert.match(KEYRING_SETTINGS_SOURCE, /data-keyring-log-next/);
    assert.match(KEYRING_SETTINGS_SOURCE, /eventPageSize = 10/);
    assert.match(KEYRING_SETTINGS_SOURCE, /keyring:listEvents/);
    assert.match(KEYRING_SETTINGS_SOURCE, /keyring:changePassword/);
    assert.match(KEYRING_SETTINGS_SOURCE, /keyring:clear/);
    assert.match(KEYRING_SETTINGS_SOURCE, /keyring:destroy/);
    assert.match(KEYRING_SETTINGS_SOURCE, /destroyKeyring\(\)/);
    assert.doesNotMatch(
        KEYRING_SETTINGS_SOURCE,
        /settings-keyring-clear[^>]*disabled/,
    );
    assert.doesNotMatch(KEYRING_SETTINGS_SOURCE, /requestPasswordConfirmation/);
    assert.match(KEYRING_SETTINGS_SOURCE, /settings\.css/);
    assert.match(KEYRING_SETTINGS_SOURCE, /data-keyring-expand/);
    assert.match(KEYRING_SETTINGS_SOURCE, /renderSecretVisibilityField/);
    assert.match(KEYRING_SETTINGS_SOURCE, /bindSecretVisibilityToggles/);
    assert.match(KEYRING_SETTINGS_SOURCE, /class="theme-select"/);
    assert.doesNotMatch(KEYRING_SETTINGS_SOURCE, /defer-page-action/);
    assert.match(KEYRING_SETTINGS_SOURCE, /if \(!isKeyringUnlocked\(\)\)/);
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

test("expired API sessions redirect to login with expiry messaging", () => {
    assert.match(SESSION_FLOW_SOURCE, /cognis:api-access-denied/);
    assert.match(
        SESSION_FLOW_SOURCE,
        /await Promise\.resolve\(\);[\s\S]*event\.detail\?\.handled === true/,
    );
    assert.match(SESSION_FLOW_SOURCE, /event\.detail\?\.status !== 401/);
    assert.match(
        SESSION_FLOW_SOURCE,
        /uiCtx\.runFlow\("authenticate-session", \{\}\)/,
    );
    assert.match(SESSION_FLOW_SOURCE, /session\?\.authenticated === true/);
    assert.match(SESSION_FLOW_SOURCE, /suppressAccessDeniedEvent: true/);
    assert.match(
        PASSWORD_CONFIRMATION_SOURCE,
        /suppressAccessDeniedEvent: true/,
    );
});
