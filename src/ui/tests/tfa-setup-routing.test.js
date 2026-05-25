import test from "node:test";
import assert from "node:assert/strict";

import {
    redirectToRequiredTfaSetup,
    SECURITY_SETTINGS_HASH_PATH,
} from "../reuse/auth-setup-route.js";
import {
    getSettingsShellOptions,
    resolveSettingsSetupRedirect,
} from "../app/settings/setup-requirement.js";

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
    assert.equal(location.href, SECURITY_SETTINGS_HASH_PATH);
    assert.equal(SECURITY_SETTINGS_HASH_PATH, "/settings#security");
});

test("settings setup redirect is enforced only when setup is pending and the route is not already /settings#security", () => {
    assert.equal(
        resolveSettingsSetupRedirect("/settings", "", true),
        SECURITY_SETTINGS_HASH_PATH,
    );
    assert.equal(
        resolveSettingsSetupRedirect("/settings", "#security", true),
        null,
    );
    assert.equal(resolveSettingsSetupRedirect("/dashboard", "", false), null);
});

test("settings shell options do not suppress dashboard chrome regardless of auth setup state", () => {
    assert.deepEqual(getSettingsShellOptions(), {});
});
