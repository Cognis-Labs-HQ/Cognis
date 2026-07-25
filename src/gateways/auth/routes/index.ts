import {
    issueAccessToken,
    isTokenVerificationFresh,
    recordTokenVerification,
    revokeAccessToken,
    type AccessRole,
} from "../access-tokens.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthGateway } from "@cognis/core";
import type { LocalAccountStore } from "../reuse/account-store.js";
import { validateUsername } from "../reuse/account-store.js";
import { readJson } from "../../../api/reuse/read-json.js";
import { getAuthClaims } from "../guard.js";

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

function resolveRole(sessionRole: string | undefined): AccessRole {
    if (
        sessionRole === "owner" ||
        sessionRole === "admin" ||
        sessionRole === "teacher" ||
        sessionRole === "moderator" ||
        sessionRole === "user"
    ) {
        return sessionRole;
    }
    return "user";
}

export function createAuthRoutes(
    authGateway: AuthGateway,
    accountStore: LocalAccountStore,
    createProfile?: (
        accountId: string,
        handle: string,
        role?: string,
        displayName?: string,
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
            const displayName =
                String(body.displayName ?? "").trim() || undefined;
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
            const usernameError = validateUsername(username);
            if (usernameError) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: usernameError,
                            message: "Invalid username format.",
                        },
                    }),
                );
                return true;
            }
            const result = await accountStore.register(
                username,
                password,
                "user",
                displayName,
            );
            await createProfile?.(
                result.username,
                result.username,
                "user",
                displayName,
            );
            const verifyToken = issueAccessToken(
                result.username,
                result.role ?? "user",
                1800,
            );
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ...result, verifyToken } }));
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
            let role = resolveRole(session.role);
            const isFounder = await accountStore
                .isFounder(session.accountId)
                .catch(() => false);
            if (isFounder && (role === "admin" || role === "owner")) {
                role = "owner";
            }
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
            const accountDisplayName =
                (
                    await accountStore.getDisplayName(session.accountId)
                )?.trim() || undefined;
            await createProfile?.(
                session.accountId,
                session.accountId,
                role,
                accountDisplayName,
            );
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": cookie,
            });
            res.end(
                JSON.stringify({
                    data: {
                        accountId: session.accountId,
                        displayName: accountDisplayName ?? session.accountId,
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
            const rawAuthHeader = req.headers.authorization ?? "";
            const rawToken = rawAuthHeader.startsWith("Bearer ")
                ? rawAuthHeader.slice("Bearer ".length)
                : "";

            const ONE_HOUR_MS = 60 * 60 * 1000;
            if (rawToken && isTokenVerificationFresh(rawToken, ONE_HOUR_MS)) {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { verified: true } }));
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
            if (rawToken) {
                recordTokenVerification(rawToken);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { verified: true } }));
            return true;
        }

        if (url.pathname === "/api/v1/auth/logout" && req.method === "POST") {
            const cookieHeader = req.headers.cookie ?? "";
            const cookieMatch = cookieHeader.match(
                /(?:^|; )cognis_access_token=([^;]+)/,
            );
            const cookieToken = cookieMatch
                ? decodeURIComponent(cookieMatch[1])
                : null;
            if (cookieToken) {
                revokeAccessToken(cookieToken);
            }
            const useSecure = shouldSetSecureCookie(req);
            const securePart = useSecure ? "; Secure" : "";
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": `cognis_access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${securePart}`,
            });
            res.end(JSON.stringify({ data: { success: true } }));
            return true;
        }

        return false;
    };
}
