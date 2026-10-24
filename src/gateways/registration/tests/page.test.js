import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("register page uses the shared auth layout behavior", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
        "utf8",
    );
    assert.match(source, /persistLayoutPreferences:\s*false/);
    assert.match(source, /auth-brandline--panel-mobile/);
});

test("register page clears stored auth instead of redirecting authenticated users", () => {
    const source =
        readFileSync(
            resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
            "utf8",
        ) +
        readFileSync(
            resolve(ROOT, "src/gateways/registration/ui/register/form.js"),
            "utf8",
        );

    assert.match(
        source,
        /import \{ clearStoredAuthSession \} from "\/static\/reuse\/auth-session\.js";/,
    );
    assert.match(source, /clearStoredAuthSession\(\);/);
    assert.doesNotMatch(source, /redirectToDashboardIfAuthenticated/);
});

test("registration completion failure sends created accounts to recover through login", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /if \(accountCreated\)[\s\S]*window\.location\.href = "\/login"/,
    );
});

test("registration integration load failures do not disable the base form", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /for \(const descriptor[\s\S]*try \{[\s\S]*import\([\s\S]*catch \(error\)[\s\S]*registrationIntegrationsReady = true/,
    );
});

test("registration page loads auth-owned configuration through the auth client", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
        "utf8",
    );

    assert.match(source, /loadRegistrationConfig/);
    assert.doesNotMatch(
        source,
        /fetch\("\/api\/v1\/auth\/registration-config"/,
    );
});

test("registration field factories fail independently", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /try \{[\s\S]*createRegistrationField\?\.\([\s\S]*operation: "create-registration-field"/,
    );
});

test("registration validators fail independently", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /try \{[\s\S]*await integration\.module\.validateRegistration[\s\S]*catch \(error\)[\s\S]*showToast[\s\S]*continue;/,
    );
});

test("registration completion receives submitted values and integration context", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /completeRegistration\([\s\S]*values: registrationValues,[\s\S]*i18n: integration\.i18n,[\s\S]*descriptor:/,
    );
});

test("register page uses shared auth intro copy and class", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /<p class="auth-intro">\$\{escapeHtml\(i18n\.t\("ui\.app\.login\.hero\.subtitle"\)\)\}<\/p>/,
    );
});

test("register page renders invalid-token intro message instead of disabled form shell", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /if \(isInvalid\) \{\s*messageHtml = renderInPageCallout\(\{\s*variant: "danger",\s*title: i18n\.t\("ui\.reuse\.error"\),\s*\}\);/m,
    );
});

test("register page provides a standard sign-in-instead link", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/register/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /<a id="register-signin-instead" href="\/login" class="btn-neutral btn-animated auth-form-action">/,
    );
    assert.match(source, /ui\.reuse\.sign_in_instead/);
    assert.doesNotMatch(
        source,
        /id="register-signin-instead"[^>]+auth-secondary-action/,
    );
    const styles = readFileSync(
        resolve(ROOT, "src/gateways/auth/ui/login-page/index.css"),
        "utf8",
    );
    assert.match(
        styles,
        /\.auth-form \.auth-form-action \{[\s\S]*width: 100%;[\s\S]*padding: 12px 14px;/,
    );
});

test("register page HTML loads the registration gateway script", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/pages/register.html"),
        "utf8",
    );

    assert.match(
        source,
        /<script[\s\S]*type="module"[\s\S]*src="\/static\/gateways\/registration\/register\/index\.js"[\s\S]*><\/script>/,
    );
});
