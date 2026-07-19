import { extractBearerToken } from "../../../../api/reuse/access-token-http.js";
import {
    isTokenVerificationFresh,
    recordTokenVerification,
    revokeAccessTokensForSubject,
} from "../../access-tokens.js";
import type { CoreAuthGateway } from "../../gateway.js";
import type { AuthAccountStore } from "../index.js";
import {
    readJson,
    requireAuth,
    type GatewayBootstrapContext,
} from "../../../shared.js";
import type { AuthGatewayRouteHandler, AuthRouteLogMeta } from "./shared.js";

interface PasswordRouteDependencies {
    authGateway: CoreAuthGateway;
    accountStore: AuthAccountStore;
    dispatchNotification?: (envelope: {
        category: string;
        recipientUsername: string;
        subject: string;
        body: string;
    }) => Promise<unknown>;
    log?: GatewayBootstrapContext["log"];
}

export function createPasswordRoutes({
    authGateway,
    accountStore,
    dispatchNotification,
    log,
}: PasswordRouteDependencies): AuthGatewayRouteHandler {
    return async (
        req,
        res,
        url,
        logMeta: AuthRouteLogMeta,
    ): Promise<boolean> => {
        if (url.pathname === "/api/v1/auth/verify" && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const rawToken = extractBearerToken(req) ?? "";
            const oneHourMs = 60 * 60 * 1000;
            if (rawToken && isTokenVerificationFresh(rawToken, oneHourMs)) {
                log?.(
                    "debug",
                    "Password verification reused freshness window.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                    },
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { verified: true } }));
                return true;
            }
            const body = await readJson(req);
            const password = String(body.password ?? "");
            const verified = await accountStore.verify(claims.sub, password);
            if (!verified) {
                log?.("warn", "Password verification failed.", {
                    ...logMeta,
                    accountId: claims.sub,
                });
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
            log?.("info", "Password verification succeeded.", {
                ...logMeta,
                accountId: claims.sub,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { verified: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/account-lifecycle" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const body = await readJson(req);
            const action = String(body.action ?? "");
            const password = String(body.password ?? "");
            if (!["archive", "deactivate", "delete"].includes(action)) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "Unsupported account lifecycle action",
                        },
                    }),
                );
                return true;
            }
            const verified = await accountStore.verify(claims.sub, password);
            if (!verified) {
                log?.(
                    "warn",
                    "Account lifecycle password confirmation failed.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                        action,
                    },
                );
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
            if (action === "delete") {
                await accountStore.delete(claims.sub);
            } else if (accountStore.setEnabled) {
                await accountStore.setEnabled(claims.sub, false);
            } else {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "account_lifecycle_unavailable",
                            message: "Account lifecycle action unavailable",
                        },
                    }),
                );
                return true;
            }
            const revokedTokenCount = revokeAccessTokensForSubject(claims.sub);
            log?.("warn", "Applied account lifecycle action.", {
                ...logMeta,
                accountId: claims.sub,
                action,
                revokedTokenCount,
            });
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie":
                    "cognis_access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
            });
            res.end(JSON.stringify({ data: { action, completed: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/password-change-capability" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const support = authGateway.getPasswordResetSupport(
                claims.providerId,
            );
            log?.("debug", "Read password change support.", {
                ...logMeta,
                accountId: claims.sub,
                providerId: claims.providerId,
                supported: support.supported,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: support }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/reset-password" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const body = await readJson(req);
            const currentPassword = String(body.currentPassword ?? "");
            const nextPassword = String(body.password ?? "").trim();
            if (currentPassword.length === 0) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "Current password is required",
                        },
                    }),
                );
                return true;
            }
            if (!nextPassword) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "Password is required",
                        },
                    }),
                );
                return true;
            }
            if (nextPassword.length < 8) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "password_too_short",
                            message: "Password must be at least 8 characters",
                        },
                    }),
                );
                return true;
            }
            const support = authGateway.getPasswordResetSupport(
                claims.providerId,
            );
            if (!support.supported) {
                log?.(
                    "warn",
                    "Blocked password reset for unsupported provider.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                        providerId: claims.providerId,
                        reason: support.reason,
                    },
                );
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "provider_unsupported",
                            message:
                                support.reason ||
                                "Password reset is not supported for this provider.",
                        },
                    }),
                );
                return true;
            }
            try {
                await authGateway.resetPasswordForAccount(
                    claims.providerId,
                    claims.sub,
                    currentPassword,
                    nextPassword,
                );
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
                log?.("error", "Password reset failed.", {
                    ...logMeta,
                    accountId: claims.sub,
                    providerId: claims.providerId,
                    error: message,
                });
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "password_reset_failed",
                            message,
                        },
                    }),
                );
                return true;
            }
            revokeAccessTokensForSubject(claims.sub);
            log?.("info", "Password reset succeeded.", {
                ...logMeta,
                accountId: claims.sub,
                providerId: claims.providerId,
            });
            if (typeof dispatchNotification === "function") {
                dispatchNotification({
                    category: "security",
                    recipientUsername: claims.sub,
                    subject: "Password Changed",
                    body: "Your account password was changed. If you did not make this change, contact your administrator immediately.",
                }).catch((error) => {
                    log?.(
                        "error",
                        "Failed to dispatch password change notification.",
                        {
                            ...logMeta,
                            accountId: claims.sub,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                });
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        return false;
    };
}
