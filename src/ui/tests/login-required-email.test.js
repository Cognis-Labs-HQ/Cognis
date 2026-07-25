import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const LOGIN_STYLE_SOURCE = readFileSync(
    resolve(ROOT, "src/ui/styles/login.css"),
    "utf8",
);

test("login required-email enforcement resolves helper from flow-provided integration", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /loadLoginIntegrationClient\(\s*"required-email-enforcement"/,
    );
    assert.match(source, /function loadLoginIntegrationClient\(/);
    assert.match(
        source,
        /loadLoginIntegrationClient\(\s*"required-email-enforcement",\s*\(mod\)\s*=>\s*mod\.createRequiredEmailEnforcementClient\(\)/,
    );
    assert.match(source, /fetch\("\/api\/v1\/auth\/login-ui"\)/);
    assert.match(source, /requiredEmailClient\?\.enforceRequiredEmailSetup/);
    assert.doesNotMatch(source, /\/api\/v1\/users\/\$\{encodeURIComponent/);
});

test("login UI includes password reset token flow and nested signup callout link", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    assert.match(source, /\/api\/v1\/auth\/request-login-link/);
    assert.match(source, /passwordResetToken/);
    assert.match(source, /\/api\/v1\/auth\/consume-login-link/);
    assert.match(source, /password:\s*nextPassword/);
    assert.match(source, /link\.id = "login-request-link"/);
    assert.match(source, /method\?\.forgotPassword !== true/);
    assert.match(source, /actions\.replaceChildren\(\)/);
    assert.doesNotMatch(source, /<a href="#" id="login-request-link"/);
    assert.match(source, /footerHtml:\s*`<a href="\/register"/);
});

test("login UI resets password reset mode on refresh re-render", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    assert.match(source, /function resetPasswordResetMode\(\)/);
    assert.match(source, /isPasswordResetMode = false/);
    assert.match(source, /submitPasswordReset = null/);
    assert.match(
        source,
        /onRender:\s*\(\)\s*=>\s*{[\s\S]*resetPasswordResetMode\(\)/,
    );
});

test("login recovery returns through an in-place form restore", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    assert.match(source, /function restoreLoginForm\(\)/);
    assert.match(
        source,
        /replaceCredentialFieldsContent\(renderCredentialFields\(\)\)/,
    );
    assert.match(source, /toggleContainer\.replaceChildren\(\)/);
    assert.match(
        source,
        /backLink\?\.addEventListener\("click", \(\) => \{\s*restoreLoginForm\(\)/,
    );
});

test("login hides the credential provider selector before showing TFA", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /hideCredentialProviderSelector\(\);[\s\S]*tfaLoginClient\.switchToTfaPrompt\(data\)/,
    );
    assert.match(
        source,
        /if \(client\) \{\s*hideCredentialProviderSelector\(\);\s*currentTfaLoginAttemptId/,
    );
    assert.match(
        LOGIN_STYLE_SOURCE,
        /\.auth-provider-toggle\[hidden\]\s*\{\s*display:\s*none;/,
    );
});

test("login UI handles TFA prompt restore failures by falling back to login methods", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /loadTfaLoginClient\(\)[\s\S]*?\.catch\(\(error\) => {/,
    );
    assert.match(
        source,
        /\.catch\(\(error\) => \{[\s\S]*console\.error\(error\);[\s\S]*loadLoginMethods\(\);[\s\S]*runTypingShowcase\(typingSamples\);[\s\S]*\}\)/,
    );
});

test("notify required-email helper checks verified primary email", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/notify/ui/login-required-email-flow.js"),
        "utf8",
    );
    assert.match(source, /entry\.primary === true && entry\.verified === true/);
    assert.match(
        source,
        /pendingPrimary[\s\S]*entry\.primary === true && entry\.verified !== true[\s\S]*verifyRequiredEmailLoop/,
    );
});

test("in-page callout renders footer content inside the content container", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/in-page-callout.js"),
        "utf8",
    );
    assert.match(
        source,
        /<div class="in-page-callout__content">[\s\S]*\$\{footerHtml\}/,
    );
});
