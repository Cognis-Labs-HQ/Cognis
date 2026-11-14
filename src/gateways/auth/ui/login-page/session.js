export function clearLoginSession(storage = localStorage) {
    for (const key of [
        "cognis_access_token",
        "cognis_account",
        "cognis_display_name",
        "cognis_role",
        "cognis_provider_id",
        "cognis_is_founder",
        "cognis_login_time",
        "cognis_session_expires_at",
        "cognis_user_validation_mode",
    ]) {
        storage.removeItem(key);
    }
}
