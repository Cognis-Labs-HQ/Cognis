import { issueAccessToken, type AccessRole } from "../../auth/access-tokens.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthGateway } from "@cognis/core";
import type { LocalAccountStore } from "../../../adapters/auth/local/auth-adapter.js";
import { readJson } from "../read-json.js";

function resolveRole(
    sessionRole: string | undefined,
    isAdmin: boolean | undefined,
): AccessRole {
    if (
        sessionRole === "admin" ||
        sessionRole === "teacher" ||
        sessionRole === "moderator" ||
        sessionRole === "user"
    ) {
        return sessionRole;
    }
    return isAdmin ? "admin" : "user";
}

export function createAuthRoutes(
    authGateway: AuthGateway,
    accountStore: LocalAccountStore,
    createProfile?: (
        accountId: string,
        handle: string,
        role?: string,
    ) => Promise<void>,
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === "/api/v1/auth/register" && req.method === "POST") {
            const body = await readJson(req);
            const username = String(body.username ?? "");
            const password = String(body.password ?? "");
            if (!username || !password) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "username and password are required",
                        },
                    }),
                );
                return true;
            }
            const result = await accountStore.register(
                username,
                password,
                false,
            );
            await createProfile?.(username, username, "user");
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: result }));
            return true;
        }

        if (url.pathname === "/api/v1/auth/login" && req.method === "POST") {
            const body = await readJson(req);
            const session = await authGateway.authenticate(
                JSON.stringify({
                    username: body.username,
                    password: body.password,
                }),
            );
            if (!session) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_credentials",
                            message: "Invalid username or password",
                        },
                    }),
                );
                return true;
            }
            const role = resolveRole(session.role, session.isAdmin);
            const parsedTtlSeconds = Number.parseInt(
                process.env.COGNIS_ACCESS_TOKEN_TTL_SECONDS ?? "43200",
                10,
            );
            const accessTokenTtlSeconds =
                Number.isFinite(parsedTtlSeconds) && parsedTtlSeconds >= 1
                    ? parsedTtlSeconds
                    : 43200;
            const apiToken = issueAccessToken(
                session.accountId,
                role,
                accessTokenTtlSeconds,
            );
            await accountStore.updateLastLogin(session.accountId);
            await createProfile?.(session.accountId, session.accountId, role);
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": `cognis_access_token=${apiToken}; Path=/; HttpOnly; SameSite=Lax`,
            });
            res.end(
                JSON.stringify({
                    data: {
                        accountId: session.accountId,
                        displayName: session.accountId,
                        provider: session.provider,
                        role,
                        token: apiToken,
                    },
                }),
            );
            return true;
        }

        return false;
    };
}
