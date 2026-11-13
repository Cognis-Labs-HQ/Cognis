import { randomUUID } from "node:crypto";
import {
    createCtx,
    hasMinRole,
    isRoleAllowed,
    type AccessRole,
} from "@cognis/core";
import type { RouteContext } from "../../../../api/reuse/route-context.js";

type Claims = { sub: string; role: AccessRole; revoked: boolean };
const tokens = new Map<string, Claims>();

export function issueAccessToken(
    subject: string,
    role: AccessRole,
    _seconds: number,
): string {
    const token = randomUUID();
    tokens.set(token, { sub: subject, role, revoked: false });
    return token;
}

export function createAuthContext(): RouteContext {
    const system = createCtx();
    const context: RouteContext = {
        getAuthClaims(request) {
            const authorization = request.headers.authorization ?? "";
            const claims = tokens.get(authorization.replace(/^Bearer /, ""));
            return claims && !claims.revoked ? claims : null;
        },
        requireAuth(request, response, minimumRole = "user") {
            const claims = context.getAuthClaims(request);
            if (claims && hasMinRole(claims.role, minimumRole)) return claims;
            response.writeHead(claims ? 403 : 401);
            response.end(
                JSON.stringify({
                    error: { code: claims ? "forbidden" : "unauthorized" },
                }),
            );
            return null;
        },
        requireRoleAccess(request, response, policy) {
            const claims = context.requireAuth(request, response);
            if (!claims) return null;
            if (isRoleAllowed(claims.role, policy)) return claims;
            response.writeHead(403);
            response.end(JSON.stringify({ error: { code: "forbidden" } }));
            return null;
        },
        canAccessUserData: (claims, target) =>
            claims.sub === target || hasMinRole(claims.role, "admin"),
        hasMinRole,
        getCookieSession: () => null,
        setPageSecurityHeaders(response) {
            response.setHeader("x-content-type-options", "nosniff");
        },
        lookupAccessToken: (token) => tokens.get(token) ?? null,
        revokeAccessTokensForSubject(subject) {
            let count = 0;
            for (const claims of tokens.values()) {
                if (claims.sub === subject && !claims.revoked) {
                    claims.revoked = true;
                    count++;
                }
            }
            return count;
        },
        getCapability: (id) => system.getCapability(id),
        requireCapability: (id) => system.requireCapability(id),
        flow: system.flow,
    };
    return context;
}
