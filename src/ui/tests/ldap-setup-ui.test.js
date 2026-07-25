import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminPopupSource = readFileSync(
    new URL("../app/administration/adapter-config-popup.js", import.meta.url),
    "utf8",
);
const loginSource = readFileSync(
    new URL("../app/login/index.js", import.meta.url),
    "utf8",
);

test("LDAP setup collects focused user and group DNs", () => {
    assert.match(
        adminPopupSource,
        /"baseDn",\s*"userDn",\s*"groupDn",\s*"bindDn"/,
    );
});

test("LDAP role mapping sorts groups and renders names without DNs", () => {
    assert.match(adminPopupSource, /\.sort\(\(left, right\) =>/);
    assert.match(
        adminPopupSource,
        /<option value="\$\{escapeHtml\(group\.name\)\}"[^`]*>\$\{escapeHtml\(group\.name\)\}<\/option>/,
    );
});

test("login source selector precedes credential fields", () => {
    const selectorIndex = loginSource.indexOf('id="auth-provider-toggle"');
    const credentialsIndex = loginSource.indexOf(
        'id="login-credential-fields"',
    );
    assert.ok(selectorIndex >= 0);
    assert.ok(selectorIndex < credentialsIndex);
    assert.match(
        loginSource,
        /setAttribute\("aria-pressed", String\(active\)\)/,
    );
});
