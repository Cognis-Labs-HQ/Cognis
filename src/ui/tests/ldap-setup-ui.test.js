import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ldapPopupSource = readFileSync(
    new URL("../../adapters/auth/ldap/ui/config-popup.js", import.meta.url),
    "utf8",
);
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
        ldapPopupSource,
        /"baseDn",\s*"userDn",\s*"groupDn",\s*"bindDn"/,
    );
});

test("LDAP role mapping sorts groups and renders names without DNs", () => {
    assert.match(ldapPopupSource, /\.sort\(\(left, right\) =>/);
    assert.match(
        ldapPopupSource,
        /<option value="\$\{escapeHtml\(group\.name\)\}"[^`]*>\$\{escapeHtml\(group\.name\)\}<\/option>/,
    );
});

test("LDAP test and discovery replaces role mapping results on every run", () => {
    assert.match(ldapPopupSource, /let discoverySequence = 0/);
    assert.match(
        ldapPopupSource,
        /const currentDiscovery = \+\+discoverySequence;[\s\S]*sample = null;[\s\S]*sample = testPayload\.data;[\s\S]*api\.setPage\("filters"\)/,
    );
});

test("adapter configuration loads only explicitly announced popup extensions", () => {
    assert.match(
        adminPopupSource,
        /payload\.configPopupScriptUrl[\s\S]*import\(configPopupScriptUrl\)/,
    );
    assert.doesNotMatch(
        adminPopupSource,
        /static\/adapters\/\$\{encodeURIComponent/,
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
