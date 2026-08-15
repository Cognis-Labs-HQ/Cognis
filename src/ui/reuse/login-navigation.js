/**
 * Builds and resolves safe same-origin navigation URLs around authentication.
 *
 * Public exports:
 * - withLoginReturnPath() — adds the current page as a login `next` parameter.
 * - getLoginReturnPath() — validates and returns a login `next` destination.
 *
 * Usage:
 *   window.location.replace(withLoginReturnPath('/login?reason=session_expired'));
 *   window.location.href = getLoginReturnPath() ?? '/dashboard';
 *
 * @param {string} loginUrl Login URL that may already contain query parameters.
 * @param {Location} [location] Browser location whose relative URL should be retained.
 * @returns {string} Login URL containing an encoded `next` parameter.
 */
export function withLoginReturnPath(loginUrl, location = window.location) {
    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    const url = new URL(loginUrl, location.origin);
    url.searchParams.set("next", returnPath);
    return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * @param {Location} [location] Login-page location containing the `next` parameter.
 * @returns {string|null} A safe same-origin path, or null for invalid input.
 */
export function getLoginReturnPath(location = window.location) {
    const next = new URL(location.href).searchParams.get("next");
    if (!next || !next.startsWith("/") || next.startsWith("//")) return null;

    const destination = new URL(next, location.origin);
    if (destination.origin !== location.origin) return null;
    if (destination.pathname === "/login") return null;
    return `${destination.pathname}${destination.search}${destination.hash}`;
}
