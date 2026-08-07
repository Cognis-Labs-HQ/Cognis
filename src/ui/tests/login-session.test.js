import assert from "node:assert/strict";
import test from "node:test";

import {
    clearLoginSession,
    persistLoginSession,
} from "../app/login/session.js";

function createStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        removeItem: (key) => values.delete(key),
        setItem: (key, value) => values.set(key, String(value)),
    };
}

test("login session persistence records and clears authentication state", () => {
    const storage = createStorage();
    persistLoginSession(
        {
            token: "access-token",
            accountId: "account-id",
            displayName: "Account Name",
            role: "admin",
            providerId: "ldap",
            isFounder: true,
            userValidationMode: "smtp",
        },
        storage,
    );

    assert.equal(storage.getItem("cognis_access_token"), "access-token");
    assert.equal(storage.getItem("cognis_account"), "account-id");
    assert.equal(storage.getItem("cognis_display_name"), "Account Name");
    assert.equal(storage.getItem("cognis_role"), "admin");
    assert.equal(storage.getItem("cognis_provider_id"), "ldap");
    assert.equal(storage.getItem("cognis_is_founder"), "true");
    assert.equal(storage.getItem("cognis_user_validation_mode"), "smtp");
    assert.match(storage.getItem("cognis_login_time"), /^\d{4}-\d{2}-\d{2}T/);

    clearLoginSession(storage);
    assert.equal(storage.getItem("cognis_access_token"), null);
    assert.equal(storage.getItem("cognis_account"), null);
    assert.equal(storage.getItem("cognis_user_validation_mode"), null);
});
