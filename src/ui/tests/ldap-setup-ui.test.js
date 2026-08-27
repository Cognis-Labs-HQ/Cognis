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
const administrationSource = readFileSync(
    new URL("../app/administration/index.js", import.meta.url),
    "utf8",
);
const administrationApiSource = readFileSync(
    new URL("../app/administration/api-loaders.js", import.meta.url),
    "utf8",
);
const loginSource = readFileSync(
    new URL("../app/login/index.js", import.meta.url),
    "utf8",
);
const popupSource = readFileSync(
    new URL("../reuse/popup.js", import.meta.url),
    "utf8",
);

test("LDAP setup collects focused user and group DNs", () => {
    assert.match(
        ldapPopupSource,
        /"baseDn",\s*"userDn",\s*"groupDn",\s*"bindDn"/,
    );
});

test("LDAP setup composes and validates required connection fields", () => {
    assert.match(ldapPopupSource, /import \{ createFormBuilder \}/);
    assert.match(ldapPopupSource, /name: "serverUrl"[\s\S]*required: true/);
    assert.match(
        ldapPopupSource,
        /connectionFormController\?\.validateAll\(true\)/,
    );
    assert.match(ldapPopupSource, /closeProtection: true/);
    assert.match(
        ldapPopupSource,
        /action === "cancel"[\s\S]*api\.requestClose\(\)/,
    );
    assert.match(
        ldapPopupSource,
        /action === null \|\| action === "cancel"[\s\S]*api\.requestClose\(\)/,
    );
    assert.match(popupSource, /requestClose: \(\) => dismiss\(null\)/);
    assert.match(ldapPopupSource, /configuredSecretFields/);
    assert.match(ldapPopupSource, /Leave blank to keep the saved password/);
});

test("LDAP setup manages named, reorderable servers and unified login", () => {
    assert.match(ldapPopupSource, /name: "identifier"[\s\S]*required: true/);
    assert.match(ldapPopupSource, /id: "servers"/);
    assert.match(ldapPopupSource, /ldap-add-server/);
    assert.match(ldapPopupSource, /draggable="true"/);
    assert.match(ldapPopupSource, /addEventListener\("drop"/);
    assert.match(ldapPopupSource, /JSON\.stringify\(\{ unify, servers \}\)/);
});

test("LDAP setup exposes and updates the adapter power control", () => {
    assert.match(administrationSource, /enableUrl: resolveAdapterControlUrl/);
    assert.match(administrationSource, /disableUrl: resolveAdapterControlUrl/);
    assert.match(adminPopupSource, /adapterEnabled,[\s\S]*onSaved/);
    assert.match(ldapPopupSource, /name="adapterEnabled" type="checkbox"/);
    assert.match(
        ldapPopupSource,
        /const controlUrl = nextEnabled \? enableUrl : disableUrl/,
    );
    assert.match(ldapPopupSource, /apiFetch\(controlUrl, \{\s*method: "POST"/);
});

test("LDAP setup disables adapter activation until a server is configured", () => {
    assert.match(
        ldapPopupSource,
        /!enabled && servers\.length === 0 \? " disabled" : ""/,
    );
    assert.match(
        ldapPopupSource,
        /if \(nextEnabled && servers\.length === 0\)/,
    );
    assert.match(
        ldapPopupSource,
        /if \(nextEnabled && !\(await persistServers\(\)\)\)/,
    );
});

test("LDAP setup directs Enter to user authentication verification", () => {
    assert.match(ldapPopupSource, /label: "Test user authentication"/);
    assert.match(
        ldapPopupSource,
        /form\.addEventListener\("keydown"[\s\S]*event\.key !== "Enter"[\s\S]*data-popup-action="verify-user"/,
    );
});

test("starting a new LDAP server enables abandonment confirmation", () => {
    assert.match(
        ldapPopupSource,
        /querySelector\("\.ldap-add-server"\)[\s\S]*api\.markDirty\(\);[\s\S]*api\.setPage\("connect"\)/,
    );
});

test("LDAP setup requires a successful user bind before completion", () => {
    assert.match(ldapPopupSource, /id: "credentials"/);
    assert.match(ldapPopupSource, /id: "verify-user"/);
    assert.match(ldapPopupSource, /testUsername/);
    assert.match(ldapPopupSource, /testPassword/);
    assert.match(ldapPopupSource, /credentialTestResult/);
    assert.match(ldapPopupSource, /action !== "complete"/);
});

test("adapter setup checks honor adapter-reported configuration state", () => {
    assert.match(administrationApiSource, /typeof payload\.configured/);
    assert.match(administrationApiSource, /return !payload\.configured/);
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
    const titleIndex = loginSource.indexOf('class="auth-heading"');
    const selectorIndex = loginSource.indexOf('id="auth-provider-toggle"');
    const credentialsIndex = loginSource.indexOf(
        'id="login-credential-fields"',
    );
    assert.ok(selectorIndex >= 0);
    assert.ok(titleIndex >= 0);
    assert.ok(titleIndex < selectorIndex);
    assert.ok(selectorIndex < credentialsIndex);
    assert.match(
        loginSource,
        /<h2 class="auth-heading"[^>]*>[^`]*<\/h2>\s*<div id="auth-provider-toggle"/,
    );
    assert.match(
        loginSource,
        /setAttribute\("aria-pressed", String\(active\)\)/,
    );
    assert.match(loginSource, /auth-provider-overflow-btn/);
    assert.match(loginSource, /new ResizeObserver/);
    assert.match(loginSource, /auth-provider-overflow-list/);
    assert.match(
        loginSource,
        /method\.id === "local" \|\| method\.id === "ldap"[\s\S]*else \{\s*btn\.textContent = method\.name;/,
    );
});
