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
const STYLES = readFileSync(
    resolve(ROOT, "src/gateways/tfa/ui/login.css"),
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
        /if \(deliveryToastShownOnce \|\| skipDeliveryToast\)/,
    );
    assert.match(
        SOURCE,
        /showToast\(\s*[\s\S]*?ui\.app\.login\.tfa\.smtp\.resend_sent[\s\S]*?\{\s*variant:\s*"success",?\s*\}/,
    );
    assert.doesNotMatch(
        SOURCE,
        /showToast\(\s*i18n(?:\s*\n\s*)?\.t\("ui\.app\.login\.tfa\.smtp\.rate_limited_notice"\)/,
    );
});

test("tfa login resend success responses always show the resend success toast", () => {
    assert.match(SOURCE, /deliveryToastShownOnce = true;/);
    assert.match(
        SOURCE,
        /setResendStateForMethod\(\s*resolveMethod\(methodId\),\s*\{\s*skipDeliveryToast:\s*true,?\s*\}\s*\)/,
    );
});

test("tfa login syncs the resend link disabled state through a shared helper", () => {
    assert.match(SOURCE, /const syncDisabledResendState = \(\) => {/);
    assert.match(SOURCE, /resendLocked = true;\s*syncDisabledResendState\(\);/);
    assert.match(
        SOURCE,
        /resendLocked = false;\s*syncDisabledResendState\(\);/,
    );
});

test("tfa login warns when resend action element exists with an unexpected type", () => {
    assert.match(
        SOURCE,
        /Expected #login-tfa-resend-action to be an anchor element\./,
    );
});

test("tfa login always shows the configured method selector", () => {
    assert.match(SOURCE, /tabsEl\.hidden = false;/);
    assert.match(
        STYLES,
        /#login-tfa-method-nav\s*\{\s*background:\s*transparent;/,
    );
});
