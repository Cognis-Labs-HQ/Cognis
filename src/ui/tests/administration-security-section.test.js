import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

test("administration security section renders password policy controls", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/administration/security.js"),
        "utf8",
    );

    assert.match(
        source,
        /from "\/static\/gateways\/auth\/password-policy\.js"/,
    );
    assert.match(source, /id: "security-policy-min-length"/);
    assert.match(source, /id: "security-policy-require-uppercase"/);
    assert.match(source, /id: "security-policy-require-lowercase"/);
    assert.match(source, /id: "security-policy-require-digit"/);
    assert.match(source, /id: "security-policy-require-special"/);
    assert.match(source, /password_policy_heading/);
    assert.match(source, /id="security-enforce-tfa-for-all-users"/);
    assert.match(source, /enforceTfaForAllUsers/);
});

test("administration security section hides smtp mode when smtp adapter is unavailable", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/administration/security.js"),
        "utf8",
    );

    assert.match(source, /smtpOption\.hidden = true/);
    assert.match(source, /if \(!smtpAdapterActive\) return "none"/);
    assert.match(
        source,
        /const validationMode = smtpAdapterActive[\s\S]*: originalUserValidationMode/,
    );
});

test("administration dependency links scroll centered after expanding target gateway", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/administration/index.js"),
        "utf8",
    );

    assert.match(source, /gatewayContainer\.setAttribute\("open", ""\)/);
    assert.match(source, /requestAnimationFrame\(\(\) => \{/);
    assert.match(source, /block: "center"/);
    assert.match(source, /inline: "nearest"/);
});
