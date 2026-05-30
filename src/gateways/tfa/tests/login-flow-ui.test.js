import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../../../../");
const SOURCE = readFileSync(
    resolve(ROOT, "src/gateways/tfa/ui/login-flow.js"),
    "utf8",
);

test("tfa login resend action toggles disabled state while cooldown is active", () => {
    assert.match(
        SOURCE,
        /classList\.toggle\(\s*"auth-text-action--disabled",\s*resendLocked,\s*\)/,
    );
    assert.match(
        SOURCE,
        /setAttribute\(\s*"aria-disabled",\s*resendLocked \? "true" : "false",\s*\)/,
    );
});

test("tfa login resend success toast is skipped for smtp_rate_limited responses", () => {
    assert.match(
        SOURCE,
        /if \(challengeMessage !== "smtp_rate_limited"\) {\s*showToast\(/,
    );
    assert.doesNotMatch(
        SOURCE,
        /if \(response\.ok\) {\s*[\s\S]*showToast\(\s*i18n\.t\("ui\.app\.login\.tfa\.smtp\.resend_sent"\),/,
    );
});
