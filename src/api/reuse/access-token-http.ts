import type { IncomingMessage } from "node:http";

/**
 * Returns true when the `cognis_access_token` cookie should be marked Secure.
 *
 * Evaluation order:
 * 1. If `COGNIS_SECURE_COOKIES` env var is "1" or "true", always Secure.
 * 2. If `COGNIS_SECURE_COOKIES` env var is "0" or "false", never Secure.
 * 3. Otherwise, inspect the `X-Forwarded-Proto` header set by a reverse proxy
 *    or load balancer. If any comma-separated value is "https", mark Secure.
 *    This means direct HTTP connections (where the header is absent) default to
 *    non-Secure, while HTTPS-terminated proxies automatically enable it.
 */
export function shouldSetSecureCookie(req: IncomingMessage): boolean {
    const forced = process.env.COGNIS_SECURE_COOKIES;
    if (forced === "1" || forced === "true") return true;
    if (forced === "0" || forced === "false") return false;
    const forwardedProto = req.headers["x-forwarded-proto"];
    if (typeof forwardedProto !== "string") return false;
    return forwardedProto
        .split(",")
        .some((value) => value.trim().toLowerCase() === "https");
}

export function buildAccessTokenCookie(
    token: string,
    ttlSeconds: number,
    useSecure: boolean,
): string {
    const securePart = useSecure ? "; Secure" : "";
    return `cognis_access_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttlSeconds}${securePart}`;
}

export function extractCookieToken(req: IncomingMessage): string | null {
    const cookieHeader = req.headers.cookie ?? "";
    const cookiePairs = cookieHeader.split(";");
    for (const cookiePair of cookiePairs) {
        const trimmedCookiePair = cookiePair.trim();
        if (!trimmedCookiePair.startsWith("cognis_access_token=")) {
            continue;
        }
        const rawCookieValue = trimmedCookiePair.slice(
            "cognis_access_token=".length,
        );
        return decodeURIComponent(rawCookieValue);
    }
    return null;
}

export function extractBearerToken(req: IncomingMessage): string | null {
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.slice("Bearer ".length);
}
