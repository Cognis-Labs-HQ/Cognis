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
    assert.match(source, /security-enforce-tfa-for-new-users/);
});
