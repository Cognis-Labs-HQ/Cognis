import { readJson, type GatewayBootstrapContext } from "../../../shared.js";
import { resolveExternalBaseUrl } from "../../../../api/reuse/url-parts.js";
import {
    consumeAccessToken,
    issueAccessToken,
    revokeAccessToken,
    revokeAccessTokensForSubject,
    verifyAccessToken,
} from "../../access-tokens.js";
import type { CoreAuthGateway } from "../../gateway.js";
import type { AuthAccountStore } from "../index.js";
import { resolveRole } from "../local-account.js";
import { MemoryRateLimiter } from "../rate-limiter.js";
import {
    PASSWORD_RESET_LOOKUP_JITTER_MS,
    PASSWORD_RESET_TOKEN_TTL_SECONDS,
    sleep,
    waitForPasswordResetResponseFloor,
} from "../route-runtime.js";
import type { AuthGatewayRouteHandler, AuthRouteLogMeta } from "./shared.js";

interface LoginLinkRouteDependencies {
    authGateway: CoreAuthGateway;
    accountStore: AuthAccountStore;
    capabilities: import("../../../shared.js").CapabilityStore;
    oneTimeLoginAccountRateLimiter: MemoryRateLimiter;
    oneTimeLoginIpRateLimiter: MemoryRateLimiter;
    resolveRequestAddress: (req: import("node:http").IncomingMessage) => string;
    log?: GatewayBootstrapContext["log"];
}

export function createLoginLinkRoutes({
    authGateway,
    accountStore,
    capabilities,
    oneTimeLoginAccountRateLimiter,
    oneTimeLoginIpRateLimiter,
    resolveRequestAddress,
    log,
}: LoginLinkRouteDependencies): AuthGatewayRouteHandler {
    return async (
        req,
        res,
        url,
        logMeta: AuthRouteLogMeta,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/auth/login-link-status" &&
            req.method === "GET"
        ) {
            const canSendOneTimeLoginEmail = capabilities.get<() => boolean>(
                "notify:canSendOneTimeLoginEmail",
            );
            const contactEmail = String(process.env.CONTACT_EMAIL ?? "").trim();
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        available: Boolean(canSendOneTimeLoginEmail?.()),
                        contactEmail,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/request-login-link" &&
            req.method === "POST"
        ) {
            const requestStartedAt = Date.now();
            const respondWithPasswordResetEnvelope = async (
                statusCode: number,
                payload: unknown,
            ) => {
                await waitForPasswordResetResponseFloor(requestStartedAt);
                res.writeHead(statusCode, {
                    "content-type": "application/json",
                });
                res.end(JSON.stringify(payload));
                return true;
            };
            const body = await readJson(req);
            const email = String(body.email ?? "")
                .trim()
                .toLowerCase();
            if (!email) {
                return respondWithPasswordResetEnvelope(400, {
                    error: {
                        code: "email_required",
                        message: "Email is required",
                    },
                });
            }
            const requestAddress = resolveRequestAddress(req);
            const addressRateLimitKey = `address:${requestAddress}`;
            const emailRateLimitKey = `email:${email}`;
            if (
                oneTimeLoginAccountRateLimiter.isThrottled(emailRateLimitKey) ||
                oneTimeLoginIpRateLimiter.isThrottled(addressRateLimitKey)
            ) {
                return respondWithPasswordResetEnvelope(429, {
                    error: {
                        code: "rate_limited",
                        message:
                            "A password reset link was requested too recently. Please wait before trying again.",
                    },
                });
            }
            oneTimeLoginAccountRateLimiter.record(emailRateLimitKey);
            oneTimeLoginIpRateLimiter.record(addressRateLimitKey);
            const contactEmail = String(process.env.CONTACT_EMAIL ?? "").trim();
            const canSendOneTimeLoginEmail = capabilities.get<() => boolean>(
                "notify:canSendOneTimeLoginEmail",
            );
            const sendOneTimeLoginEmail = capabilities.get<
                (
                    to: string,
                    loginUrl: string,
                    options?: {
                        theme?: string;
                        subject?: string;
                        body?: string;
                        actionLabel?: string;
                    },
                ) => Promise<void>
            >("notify:sendOneTimeLoginEmail");
            const getAccountIdByEmail = capabilities.get<
                (email: string) => Promise<string | null>
            >("notify:getAccountIdByEmail");
            const externalBaseUrl = resolveExternalBaseUrl();
            if (
                !canSendOneTimeLoginEmail?.() ||
                typeof sendOneTimeLoginEmail !== "function" ||
                typeof getAccountIdByEmail !== "function" ||
                !externalBaseUrl
            ) {
                return respondWithPasswordResetEnvelope(200, {
                    data: {
                        outcome: "contact_support",
                        contactEmail,
                    },
                });
            }
            await sleep(
                Math.floor(Math.random() * PASSWORD_RESET_LOOKUP_JITTER_MS),
            );
            const accountId = await getAccountIdByEmail(email).catch(
                () => null,
            );
            const accountInfo = accountId
                ? await accountStore.getInfo(accountId).catch(() => null)
                : null;
            if (!accountInfo || accountInfo.enabled === false) {
                return respondWithPasswordResetEnvelope(200, {
                    data: {
                        outcome: "email_sent",
                    },
                });
            }
            const loginToken = issueAccessToken(
                accountInfo.username,
                resolveRole(accountInfo.role),
                PASSWORD_RESET_TOKEN_TTL_SECONDS,
                {
                    providerId: "local",
                    purpose: "password-reset",
                },
            );
            const loginUrl = `${externalBaseUrl}/login?passwordResetToken=${encodeURIComponent(loginToken)}`;
            try {
                await sendOneTimeLoginEmail(email, loginUrl, {
                    subject: "Your Cognis password reset link",
                    body: `Use this secure password reset link to choose a new Cognis password:
${loginUrl}

This link expires in 15 minutes and can only be used once.`,
                    actionLabel: "Reset Password",
                });
            } catch (error) {
                revokeAccessToken(loginToken);
                const message =
                    error instanceof Error ? error.message : String(error);
                if (message === "smtp_rate_limited") {
                    return respondWithPasswordResetEnvelope(429, {
                        error: {
                            code: "rate_limited",
                            message:
                                "A password reset link was requested too recently. Please wait before trying again.",
                        },
                    });
                }
                log?.("warn", "Failed to send password reset email.", {
                    ...logMeta,
                    error: message,
                });
                return respondWithPasswordResetEnvelope(200, {
                    data: {
                        outcome: "contact_support",
                        contactEmail,
                    },
                });
            }
            log?.("info", "Sent password reset email.", {
                ...logMeta,
            });
            return respondWithPasswordResetEnvelope(200, {
                data: { outcome: "email_sent" },
            });
        }

        if (
            url.pathname === "/api/v1/auth/check-login-link" &&
            req.method === "GET"
        ) {
            const rawToken = String(url.searchParams.get("token") ?? "").trim();
            const claims = rawToken
                ? verifyAccessToken(rawToken, { purpose: "password-reset" })
                : null;
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Invalid or expired login link",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { valid: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/consume-login-link" &&
            req.method === "POST"
        ) {
            const body = await readJson(req);
            const rawToken = String(body.token ?? "").trim();
            const nextPassword = String(body.password ?? "").trim();
            if (!rawToken) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Invalid or expired login link",
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
            const claims = consumeAccessToken(rawToken, {
                purpose: "password-reset",
            });
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Invalid or expired login link",
                        },
                    }),
                );
                return true;
            }
            const accountInfo = await accountStore
                .getInfo(claims.sub)
                .catch(() => null);
            if (!accountInfo || accountInfo.enabled === false) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_token",
                            message: "Invalid or expired login link",
                        },
                    }),
                );
                return true;
            }
            if (claims.providerId !== "local") {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "provider_unsupported",
                            message:
                                "Password reset by email is unavailable for this account.",
                        },
                    }),
                );
                return true;
            }
            const localAdapter = authGateway.getLocalAdapter();
            if (!localAdapter?.store) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "provider_unsupported",
                            message:
                                "Password reset by email is unavailable for this account.",
                        },
                    }),
                );
                return true;
            }
            try {
                await localAdapter.store.setPassword(claims.sub, nextPassword);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
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
            const revokedSubjectTokens = revokeAccessTokensForSubject(
                claims.sub,
            );
            if (revokedSubjectTokens < 1) {
                log?.(
                    "warn",
                    "No additional active subject tokens were revoked after password reset.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                    },
                );
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        return false;
    };
}
