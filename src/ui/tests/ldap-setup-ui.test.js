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
    for (const fieldName of ["baseDn", "userDn", "groupDn", "bindDn"]) {
        assert.match(ldapPopupSource, new RegExp(`name: "${fieldName}"`));
    }
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
    assert.match(ldapPopupSource, /adapter\.auth\.ldap\.keep_password/);
    assert.match(
        ldapPopupSource,
        /labelKey: "adapter\.auth\.ldap\.server_url"/,
    );
    assert.match(ldapPopupSource, /labelKey: "adapter\.auth\.ldap\.bind_dn"/);
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

test("starting a new LDAP server enables abandonment confirmation", () => {
    assert.match(
        ldapPopupSource,
        /querySelector\("\.ldap-add-server"\)[\s\S]*api\.markDirty\(\);[\s\S]*api\.setPage\("connect"\)/,
    );
});

test("deleting the last LDAP server confirms and disables the adapter", () => {
    assert.match(
        ldapPopupSource,
        /if \(servers\.length === 1\)[\s\S]*adapter\.auth\.ldap\.delete_last\.body/,
    );
    assert.match(
        ldapPopupSource,
        /if \(confirmed !== "delete"\) return;[\s\S]*apiFetch\(\s*disableUrl/,
    );
});

test("LDAP setup flags every server field identified by the API", () => {
    assert.match(ldapPopupSource, /import \{ markPopupFieldInvalid \}/);
    assert.match(
        ldapPopupSource,
        /Object\.entries\(\s*pendingConnectionFieldErrors/,
    );
    assert.match(
        ldapPopupSource,
        /markPopupFieldInvalid\(overlay, fieldName, message\)/,
    );
});

test("LDAP setup localizes copy and confirms successful operations", () => {
    assert.match(
        ldapPopupSource,
        /adapter\.auth\.ldap\.authentication_succeeded/,
    );
    assert.match(ldapPopupSource, /adapter\.auth\.ldap\.server_created/);
    assert.match(ldapPopupSource, /adapter\.auth\.ldap\.server_updated/);
    assert.match(ldapPopupSource, /showToast\([\s\S]*variant: "success"/);
});

test("LDAP user authentication reports missing required credentials", () => {
    assert.match(
        ldapPopupSource,
        /!credentialFormController\?\.validateAll\(true\)[\s\S]*adapter\.auth\.ldap\.authentication_fields_required[\s\S]*variant: "error"/,
    );
    assert.match(
        ldapPopupSource,
        /labelKey: "adapter\.auth\.ldap\.test_username"/,
    );
    assert.match(
        ldapPopupSource,
        /labelKey: "adapter\.auth\.ldap\.test_password"/,
    );
});

test("LDAP setup requires a successful user bind before completion", () => {
    assert.match(ldapPopupSource, /id: "credentials"/);
    assert.match(ldapPopupSource, /id: "verify-user"/);
    assert.match(ldapPopupSource, /testUsername/);
    assert.match(ldapPopupSource, /testPassword/);
    assert.match(ldapPopupSource, /credentialTestResult/);
    assert.match(
        ldapPopupSource,
        /id: "complete"[\s\S]*label: i18n\.t\("ui\.app\.admin\.notif\.save_settings"\)[\s\S]*variant: "confirm"/,
    );
    assert.match(ldapPopupSource, /action !== "complete"/);
    assert.match(
        ldapPopupSource,
        /action === "complete" && !credentialTestResult/,
    );
    assert.match(
        ldapPopupSource,
        /if \(!\(await verifyUserAuthentication\(values\)\)\) \{\s*api\.setPage\("connect"\)/,
    );
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
