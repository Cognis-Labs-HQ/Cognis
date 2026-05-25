import test from "node:test";
import assert from "node:assert/strict";

import {
    SECURITY_SETTINGS_HASH_PATH as SETTINGS_SECURITY_HASH_PATH,
    getSettingsShellOptions,
    resolveSettingsSetupRedirect,
} from "../app/settings/setup-requirement.js";
import {
    SECURITY_SETTINGS_HASH_PATH as LOGIN_SECURITY_HASH_PATH,
    redirectToRequiredTfaSetup,
} from "../../gateways/tfa/ui/setup-redirect.js";

test("login TFA setup redirect persists the session and targets /settings#security", () => {
    let persistedSession = null;
    const location = { href: "" };
    const sessionData = { token: "pending-token", accountId: "alice" };

    redirectToRequiredTfaSetup(
        (data) => {
            persistedSession = data;
        },
        sessionData,
        location,
    );

    assert.deepEqual(persistedSession, sessionData);
    assert.equal(location.href, LOGIN_SECURITY_HASH_PATH);
    assert.equal(LOGIN_SECURITY_HASH_PATH, "/settings#security");
});

test("settings setup redirect is enforced only when setup is pending and the route is not already /settings#security", () => {
    assert.equal(
        resolveSettingsSetupRedirect("/settings", "", true),
        SETTINGS_SECURITY_HASH_PATH,
    );
    assert.equal(
        resolveSettingsSetupRedirect("/settings", "#security", true),
        null,
    );
    assert.equal(resolveSettingsSetupRedirect("/dashboard", "", false), null);
});

test("settings shell options hide dashboard chrome while auth setup is pending", () => {
    assert.deepEqual(getSettingsShellOptions(true), {
        frameless: true,
        showFooter: false,
        showNavbar: false,
        showThemeToggle: false,
        showTopbar: false,
    });
    assert.deepEqual(getSettingsShellOptions(false), {
        frameless: false,
        showFooter: true,
        showNavbar: true,
        showThemeToggle: true,
        showTopbar: true,
    });
});
