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

test("auth security preferences only render password reset controls", () => {
    assert.match(SOURCE, /settings-auth-password-reset/);
    assert.match(SOURCE, /settings-reset-password-btn/);
    assert.doesNotMatch(SOURCE, /settings-auth-recovery-codes/);
    assert.doesNotMatch(SOURCE, /available-tfa-methods/);
    assert.doesNotMatch(SOURCE, /preferred-tfa-methods/);
});

test("password change popup revalidates confirm password reactively", () => {
    assert.match(
        PASSWORD_CHANGE_SOURCE,
        /bindConfirmPasswordRevalidation\(\{[\s\S]*passwordFieldName: "nextPassword"[\s\S]*confirmFieldName: "confirmPassword"/m,
    );
});
