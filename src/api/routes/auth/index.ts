import { issueAccessToken, type AccessRole } from "../../auth/access-tokens.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthGateway } from "@cognis/core";
import type { LocalAccountStore } from "../../reuse/account-store.js";
import { readJson } from "../../reuse/read-json.js";
import { getAuthClaims } from "../../auth/guard.js";

function shouldSetSecureCookie(req: IncomingMessage): boolean {
    const forced = process.env.COGNIS_SECURE_COOKIES;
    if (forced === "1" || forced === "true") return true;
    if (forced === "0" || forced === "false") return false;
    const forwardedProto = req.headers["x-forwarded-proto"];
    if (typeof forwardedProto !== "string") return false;
    return forwardedProto
        .split(",")
        .some((value: string) => value.trim().toLowerCase() === "https");
}

function buildAccessTokenCookie(
    token: string,
    ttlSeconds: number,
    useSecure: boolean,
): string {
    const securePart = useSecure ? "; Secure" : "";
    return `cognis_access_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttlSeconds}${securePart}`;
}

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
            const cookie = buildAccessTokenCookie(
                apiToken,
                accessTokenTtlSeconds,
                shouldSetSecureCookie(req),
            );
            await accountStore.updateLastLogin(session.accountId);
            await createProfile?.(session.accountId, session.accountId, role);
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": cookie,
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

        if (url.pathname === "/api/v1/auth/verify" && req.method === "POST") {
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
            const body = await readJson(req);
            const password = String(body.password ?? "");
            const verified = await accountStore.verify(claims.sub, password);
            if (!verified) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_credentials",
                            message: "Incorrect password",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { verified: true } }));
            return true;
        }

        return false;
    };
}
