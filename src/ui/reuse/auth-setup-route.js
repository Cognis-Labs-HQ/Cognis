export const SECURITY_SETTINGS_HASH_PATH = "/settings#security";

export function redirectToRequiredTfaSetup(
    persistSession,
    data,
    location = window.location,
) {
    persistSession(data);
    location.href = SECURITY_SETTINGS_HASH_PATH;
}
