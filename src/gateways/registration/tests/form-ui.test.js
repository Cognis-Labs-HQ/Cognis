import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function read(relativePath) {
    return readFileSync(resolve(ROOT, relativePath), "utf8");
}

test("register page uses form builder instead of hardcoded maxlength for username", () => {
    const source = read("src/gateways/registration/ui/register/index.js");
    assert.match(
        source,
        /import \{ createFormBuilder \} from "\/static\/reuse\/form-builder\.js";/,
    );
    assert.doesNotMatch(source, /maxlength="25"/);
    assert.match(
        source,
        /id: "username-max-length",[\s\S]*type: "maxLength",[\s\S]*value: REGISTER_USERNAME_MAX_CHARACTERS,/m,
    );
    assert.match(
        source,
        /name: "username",[\s\S]*maxCharacters: REGISTER_USERNAME_MAX_CHARACTERS/m,
    );
    assert.match(
        source,
        /name: "email",[\s\S]*maxCharacters: REGISTER_EMAIL_MAX_CHARACTERS/m,
    );
    assert.match(
        source,
        /name: "displayName",[\s\S]*maxCharacters: REGISTER_DISPLAY_NAME_MAX_CHARACTERS/m,
    );
});

test("register invite countdown uses a pill and auth cards size independently", () => {
    const registerSource = read(
        "src/gateways/registration/ui/register/index.js",
    );
    const authStyles = read("src/gateways/auth/ui/login-page/index.css");

    assert.match(
        registerSource,
        /id="register-countdown" class="auth-countdown-pill" aria-live="off"/,
    );
    assert.match(authStyles, /\.auth-layout \{[\s\S]*align-items: start;/m);
    assert.match(
        authStyles,
        /\.auth-countdown-pill \{[\s\S]*border-radius: 999px;/m,
    );
});

test("register form leaves field styling to the shared form builder", () => {
    const registerPage = read(
        "src/gateways/registration/ui/pages/register.html",
    );
    const registerSource = read(
        "src/gateways/registration/ui/register/index.js",
    );

    assert.match(
        registerPage,
        /href="\/static\/styles\/reuse\/page-sections\.css"/,
    );
    assert.doesNotMatch(registerSource, /formClassName:\s*"auth-form"/);
});

test("register password criteria use floating alert in form builder config", () => {
    const source = read("src/gateways/registration/ui/register/index.js");
    assert.match(source, /criteriaDisplay: "floating-alert"/);
    assert.match(
        source,
        /floatingTitleKey: "ui\.app\.register\.password_requirements"/,
    );
});

test("register username criteria use floating alert in form builder config", () => {
    const source = read("src/gateways/registration/ui/register/index.js");
    assert.match(
        source,
        /floatingTitleKey: "ui\.app\.register\.username_requirements"/,
    );
});

test("register submit blocks when form builder marks fields invalid", () => {
    const source = read("src/gateways/registration/ui/register/index.js");
    assert.match(source, /formController\.validateAll\(true\)/);
    assert.match(source, /ui\.app\.register\.error\.validation_failed/);
});

test("register username criterion allows only letters, digits, hyphens, and underscores", () => {
    const source = read("src/gateways/registration/ui/register/index.js");
    assert.match(source, /id: "username-printable-ascii"/);
    assert.match(source, /\[a-zA-Z0-9_-\]/);
    assert.match(
        source,
        /username-printable-ascii[\s\S]*?value\.length === 0/m,
    );
});

test("register confirm password criterion only evaluates after password input", () => {
    const source = read("src/gateways/registration/ui/register/index.js");
    assert.match(
        source,
        /const passwordValue = String\([\s\S]*values\?\.password \?\? ""[\s\S]*\)/m,
    );
    assert.match(source, /if \(passwordValue\.length === 0\)/);
    assert.match(source, /return null/);
    assert.match(source, /return value === passwordValue/);
    assert.match(source, /messageKey: "ui\.app\.register\.passwords_match"/);
});

test("register confirm password revalidates reactively when password changes", () => {
    const source = read("src/gateways/registration/ui/register/index.js");
    assert.match(
        source,
        /bindConfirmPasswordRevalidation\(\{\s*form,\s*formController,\s*passwordFieldName:\s*"password",\s*confirmFieldName:\s*"confirmPassword",/m,
    );
});

test("administration registration policy uses composed radio groups and dirty tracking", () => {
    const source = read("src/gateways/registration/ui/admin-section.js");
    assert.match(source, /createFormBuilder/);
    assert.match(source, /createFormDirtyTracker/);
    assert.match(source, /type: "radio"/);
    assert.doesNotMatch(source, /type: "checkbox"/);
    assert.match(source, /policyFormBinding\?\.getValues\(\)/);
});
