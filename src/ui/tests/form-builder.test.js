import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(relativePath) {
    return readFileSync(resolve(ROOT, relativePath), "utf8");
}

test("form builder reuse utility exports createFormBuilder", () => {
    const source = read("src/ui/reuse/form-builder.js");
    assert.match(source, /export function createFormBuilder\(/);
    assert.match(source, /data-form-builder-floating=/);
    assert.match(source, /form-builder-criterion-item--met/);
    assert.match(source, /form-builder-required-flag/);
    assert.match(source, /form-builder-label-text/);
    assert.match(source, /aria-hidden="true"/);
});

test("register page uses form builder instead of hardcoded maxlength for username", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(
        source,
        /import \{ createFormBuilder \} from "\/static\/reuse\/form-builder\.js";/,
    );
    assert.doesNotMatch(source, /maxlength="25"/);
    assert.match(
        source,
        /id: "username-max-length",[\s\S]*type: "maxLength",[\s\S]*value: 25,/m,
    );
});

test("register password criteria use floating alert in form builder config", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(source, /criteriaDisplay: "floating-alert"/);
    assert.match(
        source,
        /floatingTitleKey: "ui\.app\.register\.password_requirements"/,
    );
});

test("register username criteria use floating alert in form builder config", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(
        source,
        /floatingTitleKey: "ui\.app\.register\.username_requirements"/,
    );
});

test("register submit blocks when form builder marks fields invalid", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(source, /formController\.validateAll\(true\)/);
    assert.match(source, /ui\.app\.register\.error\.validation_failed/);
});

test("register username criterion allows only letters, digits, hyphens, and underscores", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(source, /id: "username-printable-ascii"/);
    assert.match(source, /\[a-zA-Z0-9_-\]/);
    assert.match(
        source,
        /username-printable-ascii[\s\S]*?value\.length === 0/m,
    );
});

test("register confirm password criterion only evaluates after password input", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(
        source,
        /const passwordValue = String\([\s\S]*values\?\.password \?\? ""[\s\S]*\)/m,
    );
    assert.match(source, /if \(passwordValue\.length === 0\)/);
    assert.match(source, /return null/);
    assert.match(source, /return value === passwordValue/);
    assert.match(source, /messageKey: "ui\.app\.register\.passwords_match"/);
});

test("form builder supports neutral custom criterion state via null", () => {
    const source = read("src/ui/reuse/form-builder.js");
    assert.match(source, /if \(criterionResult === null\)/);
    assert.match(
        source,
        /"form-builder-criterion-item--met",[\s\S]*criterionValid === true/m,
    );
    assert.match(
        source,
        /"form-builder-criterion-item--unmet",[\s\S]*criterionValid === false/m,
    );
});

test("form builder supports textarea fields and max character counters", () => {
    const source = read("src/ui/reuse/form-builder.js");
    assert.match(
        source,
        /type\?: 'text'\|'email'\|'password'\|'number'\|'url'\|'select'\|'textarea'/,
    );
    assert.match(source, /fieldConfig\.maxCharacters/);
    assert.match(source, /data-form-builder-char-counter=/);
    assert.match(source, /char-counter--near-limit/);
    assert.match(source, /char-counter--at-limit/);
});

test("form builder can hide its submit button when embedding inside external popup actions", () => {
    const source = read("src/ui/reuse/form-builder.js");
    assert.match(source, /includeSubmitButton/);
    assert.match(source, /options\?\.includeSubmitButton !== false/);
});

test("profile bio and post editors use form builder max-character fields", () => {
    const source = read("src/adapters/social/profile/ui/app.js");
    assert.match(
        source,
        /import \{ createFormBuilder \} from "\/static\/reuse\/form-builder\.js";/,
    );
    assert.match(source, /PROFILE_BIO_MAX_CHARACTERS = 200/);
    assert.match(source, /POST_CONTENT_MAX_CHARACTERS = 1000/);
    assert.match(
        source,
        /name: "bio",[\s\S]*maxCharacters: PROFILE_BIO_MAX_CHARACTERS/m,
    );
    assert.match(
        source,
        /name: "content",[\s\S]*type: "textarea",[\s\S]*maxCharacters: POST_CONTENT_MAX_CHARACTERS/m,
    );
    assert.match(source, /onOpen: \(overlay\) => \{/);
    assert.match(source, /profileEditFormBuilder\.attach\(popupFormElement\)/);
});

test("register confirm password revalidates reactively when password changes", () => {
    const source = read("src/gateways/auth/ui/register.js");
    assert.match(source, /formController\.validateField\("confirmPassword"\)/);
    assert.match(source, /passwordInput\.addEventListener\(\s*"input"/m);
});
