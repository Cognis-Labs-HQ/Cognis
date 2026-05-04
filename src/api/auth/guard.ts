import type { IncomingMessage, ServerResponse } from "node:http";
import { verifyAccessToken, type AccessRole } from "./access-tokens.js";

interface AuthClaims {
    sub: string;
    role: AccessRole;
}

const roleRank = { user: 1, teacher: 2, moderator: 3, admin: 4 };

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
