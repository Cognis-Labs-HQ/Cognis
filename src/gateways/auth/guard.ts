import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyAccessToken, type AccessRole } from "./access-tokens.js";
import {
    hasMinRole,
    isRoleAllowed,
    isAccessRole,
    type RoleAccessPolicy,
} from "../../core/contracts/access-policy.js";

export { hasMinRole, isRoleAllowed, isAccessRole };
export type { RoleAccessPolicy };

const pageScriptOriginsByOwner = new Map<string, Set<string>>();

function normalizePageResourceOrigin(
    rawOrigin: string | null | undefined,
): string | null {
    const trimmed = String(rawOrigin ?? "").trim();
    if (!trimmed) return null;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return null;
    }
}

function listPageScriptOrigins(): string[] {
    return Array.from(pageScriptOriginsByOwner.values())
        .flatMap((origins) => Array.from(origins))
        .sort();
}

function buildScriptDirective(name: string): string {
    const allowedSources = ["'self'", ...listPageScriptOrigins()];
    return `${name} ${allowedSources.join(" ")}`;
}

export function registerPageScriptOrigins(
    ownerId: string,
    rawOrigins: Array<string | null | undefined>,
): string[] {
    const normalizedOwnerId = String(ownerId ?? "").trim();
    if (!normalizedOwnerId) return [];

    const origins = Array.from(
        new Set(
            rawOrigins
                .map((rawOrigin) => normalizePageResourceOrigin(rawOrigin))
                .filter((origin): origin is string => Boolean(origin)),
        ),
    ).sort();

    if (origins.length === 0) {
        pageScriptOriginsByOwner.delete(normalizedOwnerId);
        return [];
    }

    pageScriptOriginsByOwner.set(normalizedOwnerId, new Set(origins));
    return origins;
}

export function registerPageScriptOrigin(
    rawOrigin: string | null | undefined,
): string | null {
    const registeredOrigins = registerPageScriptOrigins("global", [rawOrigin]);
    return registeredOrigins[0] ?? null;
}

interface AuthClaims {
    sub: string;
    role: AccessRole;
    providerId: string;
}

/**
 * Returns true when the caller may read or write another user's data.
 * Access is granted if the caller is the target user themselves, or if the
 * caller holds at least admin rank (which includes owner).
 */
export function canAccessUserData(
    claims: { sub: string; role: AccessRole },
    targetUsername: string,
): boolean {
    return claims.sub === targetUsername || hasMinRole(claims.role, "admin");
}

export function getAuthClaims(req: IncomingMessage): AuthClaims | null {
    const raw = req.headers.authorization;
    if (!raw?.startsWith("Bearer ")) return null;
    const token = raw.slice("Bearer ".length);
    const access = verifyAccessToken(token);
    if (!access) return null;
    return {
        sub: access.sub,
        role: access.role,
        providerId: access.providerId,
    };
}

export function requireAuth(
    req: IncomingMessage,
    res: ServerResponse,
    minRole: AccessRole = "user",
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
    if (!hasMinRole(claims.role, minRole)) {
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

export function requireRoleAccess(
    req: IncomingMessage,
    res: ServerResponse,
    policy: RoleAccessPolicy,
): AuthClaims | null {
    const claims = requireAuth(req, res, policy.minRole ?? "user");
    if (!claims) return null;
    if (!policy.onlyRole || claims.role === policy.onlyRole) {
        return claims;
    }
    res.writeHead(403, { "content-type": "application/json" });
    res.end(
        JSON.stringify({
            error: {
                code: "forbidden",
                message: `Requires ${policy.onlyRole} role`,
            },
        }),
    );
    return null;
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
    return {
        sub: access.sub,
        role: access.role,
        providerId: access.providerId,
    };
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
        [
            "default-src 'self'",
            "img-src 'self' blob:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            buildScriptDirective("script-src"),
            buildScriptDirective("script-src-elem"),
            "connect-src 'self'",
            "frame-src 'self' https: http:",
            "worker-src 'self'",
            "manifest-src 'self'",
        ].join("; "),
    );
}
