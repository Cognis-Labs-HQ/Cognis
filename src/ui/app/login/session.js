export function persistLoginSession(data, storage = localStorage) {
    storage.setItem("cognis_access_token", data.token);
    storage.setItem("cognis_account", data.accountId);
    storage.setItem("cognis_display_name", data.displayName || data.accountId);
    storage.setItem("cognis_role", data.role || "user");
    storage.setItem(
        "cognis_provider_id",
        data.providerId || data.provider || "local",
    );
    storage.setItem("cognis_is_founder", data.isFounder ? "true" : "false");
    storage.setItem("cognis_login_time", new Date().toISOString());
    storage.setItem(
        "cognis_user_validation_mode",
        data.userValidationMode || "none",
    );
}

export function clearLoginSession(storage = localStorage) {
    for (const key of [
        "cognis_access_token",
        "cognis_account",
        "cognis_display_name",
        "cognis_role",
        "cognis_provider_id",
        "cognis_is_founder",
        "cognis_login_time",
        "cognis_user_validation_mode",
    ]) {
        storage.removeItem(key);
    }
}
