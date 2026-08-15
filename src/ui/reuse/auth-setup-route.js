export const SECURITY_SETTINGS_HASH_PATH = "/settings#security";

export function redirectToRequiredTfaSetup(
    persistSession,
    data,
    location = window.location,
) {
    persistSession(data);
    const next = new URL(location.href).searchParams.get("next");
    const setupUrl = new URL(SECURITY_SETTINGS_HASH_PATH, location.origin);
    if (next) setupUrl.searchParams.set("next", next);
    location.href = `${setupUrl.pathname}${setupUrl.search}${setupUrl.hash}`;
}
