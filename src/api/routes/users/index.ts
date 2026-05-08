import type { IncomingMessage, ServerResponse } from "node:http";
import type { LocalAccountStore } from "../../reuse/account-store.js";
import { getAuthClaims, requireAuth } from "../../auth/guard.js";
import type { UserPreferenceStore } from "../../reuse/preference-store.js";
import { readJson } from "../../reuse/read-json.js";
import { revokeAccessTokensForSubject } from "../../auth/access-tokens.js";

const VALID_ROLES = new Set(["user", "teacher", "moderator", "admin"]);

export function createUserRoutes(
    accountStore: LocalAccountStore,
    preferenceStore: UserPreferenceStore | undefined,
    setProfileRole?: (handle: string, role: string) => Promise<void>,
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === "/api/v1/users" && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: await accountStore.list() }));
            return true;
        }

        const infoMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/info$/,
        );
        if (infoMatch && req.method === "GET") {
            const claims = getAuthClaims(req);
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unauthorized",
                            message: "Login required",
                        },
                    }),
                );
                return true;
            }
            const target = decodeURIComponent(infoMatch[1]);
            if (claims.sub !== target && claims.role !== "admin") {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "forbidden", message: "Access denied" },
                    }),
                );
                return true;
            }
            const info = await accountStore.getInfo(target);
            if (!info) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: info }));
            return true;
        }

        const match = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)(?:\/(role|password|enable|disable|isfounder|preferences\/clear))?$/,
        );
        if (!match) return false;
        if (!requireAuth(req, res, "admin")) return true;

        const username = decodeURIComponent(match[1]);
        const action = match[2];

        if (req.method === "POST" && !action) {
            const body = await readJson(req);
            const role = String(body.role ?? "user");
            if (!VALID_ROLES.has(role)) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: `Invalid role: ${role}`,
                        },
                    }),
                );
                return true;
            }
            const created = await accountStore.register(
                username,
                String(body.password ?? "changeme"),
                role === "admin",
            );
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: created }));
            return true;
        }

        if (req.method === "POST" && action === "role") {
            const body = await readJson(req);
            const role = String(body.role ?? "user");
            if (!VALID_ROLES.has(role)) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: `Invalid role: ${role}`,
                        },
                    }),
                );
                return true;
            }
            await accountStore.setRole(username, role as any);
            await setProfileRole?.(username, role);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "password") {
            const body = await readJson(req);
            await accountStore.setPassword(
                username,
                String(body.password ?? "changeme"),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "enable") {
            await accountStore.setEnabled(username, true);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "disable") {
            await accountStore.setEnabled(username, false);
            revokeAccessTokensForSubject(username);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (req.method === "POST" && action === "isfounder") {
            const body = await readJson(req);
            await accountStore.setFounder(username, Boolean(body.isFounder));
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { updated: true, isFounder: Boolean(body.isFounder) },
                }),
            );
            return true;
        }

        if (req.method === "POST" && action === "preferences/clear") {
            if (preferenceStore) {
                await preferenceStore.clearUser(username);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { cleared: true } }));
            return true;
        }

        if (req.method === "DELETE" && !action) {
            await accountStore.delete(username);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { deleted: true } }));
            return true;
        }

        return false;
    };
}
