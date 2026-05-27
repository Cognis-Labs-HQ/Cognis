import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("login required-email enforcement uses notify gateway helper", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /import\(\s*"\/static\/gateways\/notify\/login-required-email-flow\.js"\s*\)/,
    );
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
    assert.match(source, /id="login-request-link"/);
    assert.match(source, /footerHtml:\s*`<a href="\/register"/);
});

test("notify required-email helper checks verified primary email", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/notify/ui/login-required-email-flow.js"),
        "utf8",
    );
    assert.match(source, /entry\.primary === true && entry\.verified === true/);
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
