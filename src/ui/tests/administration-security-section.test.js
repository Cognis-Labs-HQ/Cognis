import test from "node:test";
import assert from "node:assert/strict";
import { initSecuritySection } from "../app/administration/security.js";

function createI18nStub() {
    return {
        t(key) {
            return key;
        },
    };
}

test("administration security section renders password policy controls", () => {
    const section = initSecuritySection(
        {
            querySelector() {
                return null;
            },
        },
        { i18n: createI18nStub() },
    );

    const html = section.renderContent();

    assert.match(html, /id="security-policy-min-length"/);
    assert.match(html, /id="security-policy-require-uppercase"/);
    assert.match(html, /id="security-policy-require-lowercase"/);
    assert.match(html, /id="security-policy-require-digit"/);
    assert.match(html, /id="security-policy-require-special"/);
    assert.match(html, /ui\.app\.admin\.security\.password_policy_heading/);
});
