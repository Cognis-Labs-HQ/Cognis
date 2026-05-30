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

test("tfa login cooldown toast uses the resend success message", () => {
    assert.match(
        SOURCE,
        /if \(!deliveryToastShownOnce && !skipDeliveryToast\) {\s*deliveryToastShownOnce = true;\s*showToast\(\s*i18n\.t\("ui\.app\.login\.tfa\.smtp\.resend_sent"\),\s*\{ variant: "success" \}\s*\);/,
    );
    assert.doesNotMatch(
        SOURCE,
        /showToast\(\s*i18n(?:\s*\n\s*)?\.t\("ui\.app\.login\.tfa\.smtp\.rate_limited_notice"\)/,
    );
});

test("tfa login resend success responses always show the resend success toast", () => {
    assert.match(
        SOURCE,
        /if \(response\.ok\) {\s*[\s\S]*deliveryToastShownOnce = true;\s*showToast\(\s*i18n\.t\("ui\.app\.login\.tfa\.smtp\.resend_sent"\),\s*\{ variant: "success" \}\s*\);[\s\S]*setResendStateForMethod\(\s*resolveMethod\(selectedMethodId\),\s*\{ skipDeliveryToast: true \},\s*\);/,
    );
});
