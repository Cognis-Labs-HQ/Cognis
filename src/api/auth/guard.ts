import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyAccessToken, type AccessRole } from "./access-tokens.js";

interface AuthClaims {
    sub: string;
    role: AccessRole;
}

const roleRank = { user: 1, teacher: 2, moderator: 3, admin: 4, owner: 5 };

export function getAuthClaims(req: IncomingMessage): AuthClaims | null {
    const raw = req.headers.authorization;
    if (!raw?.startsWith("Bearer ")) return null;
    const token = raw.slice("Bearer ".length);
    const access = verifyAccessToken(token);
    if (!access) return null;
    return { sub: access.sub, role: access.role };
}

export function requireAuth(
    req: IncomingMessage,
    res: ServerResponse,
    minRole: keyof typeof roleRank = "user",
) {
    const claims = getAuthClaims(req);
    if (!claims) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(
            JSON.stringify({
                error: { code: "unauthorized", message: "Login required" },
            }),
        );
        return null;
    }
    if (roleRank[claims.role] < roleRank[minRole]) {
        res.writeHead(403, { "content-type": "application/json" });
        res.end(
            JSON.stringify({
                error: {
                    code: "forbidden",
                    message: `Requires ${minRole} scope`,
                },
            }),
        );
        return null;
    }
    return claims;
}

/**
 * Reads the session cookie and returns the session claims, or null when the
 * visitor is not logged in or the token is invalid. Used by page-serving
 * routes to gate HTML delivery behind authentication.
 */
export function getCookieSession(req: IncomingMessage): AuthClaims | null {
    const cookie = req.headers.cookie ?? "";
    const match = cookie.match(/(?:^|; )cognis_access_token=([^;]+)/);
    if (!match) return null;
    const token = decodeURIComponent(match[1]);
    const access = verifyAccessToken(token);
    if (!access) return null;
    return { sub: access.sub, role: access.role };
}

/**
 * Applies the standard security response headers for pages served as HTML.
 * Call this before writing a 200 response body for any HTML page route.
 */
export function setPageSecurityHeaders(res: ServerResponse): void {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("referrer-policy", "no-referrer");
    res.setHeader(
        "content-security-policy",
        "default-src 'self'; img-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'",
    );
}
