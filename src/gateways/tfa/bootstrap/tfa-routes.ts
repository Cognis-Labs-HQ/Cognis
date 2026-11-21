import { readLoginLifetime } from "./login-lifetime.js";
import { authorizeTargetAccount } from "./target-account.js";
import type { TfaChallengeLifetime } from "../contracts/method.js";
import type { ApplyEnforcementPolicy } from "./enforcement-policy.js";
import type { RouteLifetime } from "./route-lifetime.js";
import {
    commitVerifiedSession,
    rejectExpiredAssurance,
    type CompleteSession,
} from "./session-completion.js";
import type { AccessRole } from "@cognis/core";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson, type GatewayBootstrapContext } from "../../shared.js";
import { CoreTfaGateway } from "../gateway.js";

type RequireAuth = (
    req: IncomingMessage,
    res: ServerResponse,
    minRole: AccessRole,
) => {
    sub: string;
    role: AccessRole;
    providerId?: string;
    ttlSeconds: number | null;
    setupPending?: boolean;
} | null;

export function createTfaRoutes(
    gateway: CoreTfaGateway,
    capabilities: GatewayBootstrapContext["capabilities"],
    log?: GatewayBootstrapContext["log"],
    lifetime?: Pick<RouteLifetime, "capture" | "isCurrent">,
) {
    const requireAuth: RequireAuth = (req, res, minRole) => {
        const current = capabilities.get<RequireAuth>("auth:requireAuth");
        if (typeof current === "function") {
            const claims = current(req, res, minRole);
            return claims ? { ...claims } : null;
        }
        log?.("error", "TFA route authentication is unavailable.", {
            component: "tfa-gateway",
            operation: "requireAuth",
        });
        res.writeHead(503, { "content-type": "application/json" });
        res.end(
            JSON.stringify({ error: { code: "account_policy_unavailable" } }),
        );
        return null;
    };
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const revision = lifetime?.capture();
        const logMeta = {
            component: "tfa-gateway",
            method: req.method ?? "GET",
            path: url.pathname,
        };
        const targetContext = {
            req,
            res,
            url,
            capabilities,
            lifetime,
            revision,
            log,
        };

        if (
            url.pathname === "/api/v1/tfa/login/resend" &&
            req.method === "POST"
        ) {
            const body = await readJson(req);
            const loginAttemptId = String(body.loginAttemptId ?? "").trim();
            const methodId = String(body.methodId ?? "").trim();
            if (!loginAttemptId || !methodId) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "loginAttemptId and methodId are required",
                        },
                    }),
                );
                return true;
            }
            const getPendingLoginAttempt = capabilities.get<
                (loginAttemptId: string) => {
                    accountId: string;
                } | null
            >("tfa:getPendingLoginAttempt");
            if (!getPendingLoginAttempt) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "tfa_unavailable",
                            message: "Two-factor verification is unavailable",
                        },
                    }),
                );
                return true;
            }
            const pendingAttempt = getPendingLoginAttempt(loginAttemptId);
            if (!pendingAttempt) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "tfa_attempt_expired",
                            message: "TFA login attempt expired",
                        },
                    }),
                );
                return true;
            }
            let challengeLifetime: TfaChallengeLifetime;
            try {
                challengeLifetime = readLoginLifetime(
                    capabilities,
                    loginAttemptId,
                    pendingAttempt.accountId,
                );
            } catch (error) {
                log?.("error", "Pending login lifetime is unavailable.", {
                    ...logMeta,
                    operation: "read_login_lifetime",
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                });
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "tfa_unavailable",
                            message: "tfa_unavailable",
                        },
                    }),
                );
                return true;
            }
            const challenge = await gateway.beginLoginChallenge(
                pendingAttempt.accountId,
                methodId,
                challengeLifetime,
            );
            if (!challenge.ready) {
                const unavailableCode =
                    challenge.message === "method_not_configured"
                        ? "method_not_configured"
                        : "tfa_method_unavailable";
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: unavailableCode,
                            message: unavailableCode,
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        challenge: {
                            ...(challenge.deliveryStatus
                                ? { deliveryStatus: challenge.deliveryStatus }
                                : {}),
                            ...(challenge.maxLength != null
                                ? { maxLength: challenge.maxLength }
                                : {}),
                            ...(challenge.message
                                ? { message: challenge.message }
                                : {}),
                            ...(challenge.retryAfterSeconds != null
                                ? {
                                      retryAfterSeconds:
                                          challenge.retryAfterSeconds,
                                  }
                                : {}),
                            ...(challenge.resendAvailableAt
                                ? {
                                      resendAvailableAt:
                                          challenge.resendAvailableAt,
                                  }
                                : {}),
                        },
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/tfa/login/verify" &&
            req.method === "POST"
        ) {
            const body = await readJson(req);
            const loginAttemptId = String(body.loginAttemptId ?? "").trim();
            const methodId = String(body.methodId ?? "").trim();
            if (!loginAttemptId || !methodId) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "loginAttemptId and methodId are required",
                        },
                    }),
                );
                return true;
            }
            const getPendingLoginAttempt = capabilities.get<
                (loginAttemptId: string) => {
                    accountId: string;
                    displayName: string;
                    provider: string;
                    providerId: string;
                    role: string;
                    isFounder: boolean;
                    userValidationMode: "none" | "email";
                    requiredUserValidation: boolean;
                    ttlSeconds: number | null;
                } | null
            >("tfa:getPendingLoginAttempt");
            const consumePendingLoginAttempt = capabilities.get<
                (loginAttemptId: string) => boolean
            >("auth:consumePendingLoginAttempt");
            const completeSession = capabilities.get<CompleteSession>(
                "auth:completeSession",
            );
            const buildCookie = capabilities.get<
                (
                    req: IncomingMessage,
                    rawToken: string,
                    ttlSeconds: number | null,
                ) => string
            >("auth:buildAccessTokenCookie");
            if (
                !getPendingLoginAttempt ||
                !consumePendingLoginAttempt ||
                !completeSession ||
                !buildCookie
            ) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "tfa_unavailable",
                            message: "Two-factor verification is unavailable",
                        },
                    }),
                );
                return true;
            }
            const pendingAttempt = getPendingLoginAttempt(loginAttemptId);
            if (!pendingAttempt) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "tfa_attempt_expired",
                            message: "TFA login attempt expired",
                        },
                    }),
                );
                return true;
            }
            let challengeLifetime: TfaChallengeLifetime;
            try {
                challengeLifetime = readLoginLifetime(
                    capabilities,
                    loginAttemptId,
                    pendingAttempt.accountId,
                );
            } catch (error) {
                log?.("error", "Pending login lifetime is unavailable.", {
                    ...logMeta,
                    operation: "read_login_lifetime",
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                });
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "tfa_unavailable",
                            message: "tfa_unavailable",
                        },
                    }),
                );
                return true;
            }
            const tfaResult = await gateway
                .verifyLogin(
                    pendingAttempt.accountId,
                    methodId,
                    body,
                    challengeLifetime,
                )
                .catch(
                    (
                        error,
                    ): import("../gateway.js").TfaLoginVerificationResult => {
                        log?.("error", "Second-factor verification failed.", {
                            ...logMeta,
                            operation: "verifyLogin",
                            accountId: pendingAttempt.accountId,
                            errorName:
                                error instanceof Error
                                    ? error.name
                                    : "UnknownError",
                        });
                        return {
                            verified: false,
                            message: "verification_failed",
                        };
                    },
                );
            if (rejectExpiredAssurance(res, lifetime, revision)) return true;
            if (!tfaResult.verified) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code:
                                tfaResult.message || "tfa_verification_failed",
                            message:
                                tfaResult.message ||
                                "Two-factor verification failed",
                        },
                    }),
                );
                return true;
            }
            // A concurrent verifier may have consumed this attempt while the factor was checked.
            if (!consumePendingLoginAttempt(loginAttemptId)) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "tfa_attempt_expired",
                            message: "tfa_attempt_expired",
                        },
                    }),
                );
                return true;
            }
            const accessTokenTtlSeconds = pendingAttempt.ttlSeconds;
            const apiToken = await commitVerifiedSession(
                completeSession,
                {
                    accountId: pendingAttempt.accountId,
                    role: pendingAttempt.role as AccessRole,
                    ttlSeconds: accessTokenTtlSeconds,
                    providerId: pendingAttempt.providerId,
                    ...(lifetime
                        ? {
                              isAssuranceCurrent: () =>
                                  lifetime.isCurrent(revision!),
                          }
                        : {}),
                },
                res,
                log,
            );
            if (!apiToken) return true;
            log?.("info", "Login succeeded after TFA verification.", {
                ...logMeta,
                accountId: pendingAttempt.accountId,
                provider: pendingAttempt.provider,
                role: pendingAttempt.role,
                methodId,
            });
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": buildCookie(req, apiToken, accessTokenTtlSeconds),
            });
            res.end(
                JSON.stringify({
                    data: {
                        accountId: pendingAttempt.accountId,
                        displayName: pendingAttempt.displayName,
                        provider: pendingAttempt.provider,
                        providerId: pendingAttempt.providerId,
                        role: pendingAttempt.role,
                        isFounder: pendingAttempt.isFounder,
                        token: apiToken,
                        ttlSeconds: accessTokenTtlSeconds,
                        userValidationMode: pendingAttempt.userValidationMode,
                        requiredUserValidation:
                            pendingAttempt.requiredUserValidation,
                        usedRecoveryCode: tfaResult.usedRecoveryCode === true,
                        recoveryCodesRemaining:
                            Number.isFinite(tfaResult.recoveryCodesRemaining) &&
                            Number(tfaResult.recoveryCodesRemaining) >= 0
                                ? Number(tfaResult.recoveryCodesRemaining)
                                : null,
                    },
                }),
            );
            return true;
        }

        if (url.pathname === "/api/v1/tfa/status" && req.method === "GET") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const target = await authorizeTargetAccount({
                ...targetContext,
                claims,
            });
            if (!target || !target.check()) return true;
            const targetAccountId = target.accountId;
            const status = await gateway.getUserStatus(targetAccountId);
            log?.("debug", "Read TFA status.", {
                ...logMeta,
                accountId: claims.sub,
                targetAccountId,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: status }));
            return true;
        }

        if (url.pathname === "/api/v1/tfa/methods" && req.method === "GET") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const target = await authorizeTargetAccount({
                ...targetContext,
                claims,
            });
            if (!target || !target.check()) return true;
            const targetAccountId = target.accountId;
            const status = await gateway.getUserStatus(targetAccountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        availableMethods: status.availableMethods,
                        enabledMethods: status.enabledMethods,
                        preferredMethodIds: status.preferredMethodIds,
                        requiresSetup: status.requiresSetup,
                        enforcementRequired: status.enforcementRequired,
                        hasRecoveryCodes: status.hasRecoveryCodes,
                        recoveryCodesTotal: status.recoveryCodesTotal,
                        recoveryCodesRemaining: status.recoveryCodesRemaining,
                    },
                }),
            );
            return true;
        }

        const setupBeginMatch = url.pathname.match(
            /^\/api\/v1\/tfa\/methods\/([^/]+)\/setup\/begin$/,
        );
        if (setupBeginMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const methodId = decodeURIComponent(setupBeginMatch[1]);
            const body = await readJson(req);
            const displayName =
                String(body.displayName ?? claims.sub).trim() || claims.sub;
            try {
                const setup = await gateway.beginMethodSetup({
                    accountId: claims.sub,
                    displayName,
                    methodId,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: setup }));
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "setup_begin_failed",
                            message,
                        },
                    }),
                );
            }
            return true;
        }

        const setupVerifyMatch = url.pathname.match(
            /^\/api\/v1\/tfa\/methods\/([^/]+)\/setup\/verify$/,
        );
        if (setupVerifyMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const completeSession = capabilities.get<CompleteSession>(
                "auth:completeSession",
            );
            const buildCookie = capabilities.get<
                (
                    req: IncomingMessage,
                    rawToken: string,
                    ttlSeconds: number | null,
                ) => string
            >("auth:buildAccessTokenCookie");
            const body = await readJson(req);
            const setupId = String(body.setupId ?? "").trim();
            if (!setupId) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "setupId is required",
                        },
                    }),
                );
                return true;
            }
            if (!completeSession || !buildCookie) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "session_unavailable",
                            message: "session_unavailable",
                        },
                    }),
                );
                return true;
            }
            const verification =
                body.verification && typeof body.verification === "object"
                    ? (body.verification as Record<string, unknown>)
                    : body;
            const result = await gateway.verifyMethodSetup({
                accountId: claims.sub,
                setupId,
                verification,
            });
            if (!result.verified) {
                res.writeHead(422, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: result.message || "setup_verification_failed",
                            message:
                                result.message || "Setup verification failed",
                        },
                    }),
                );
                return true;
            }
            if (rejectExpiredAssurance(res, lifetime, revision)) return true;
            const responseData: Record<string, unknown> = { verified: true };
            const responseHeaders: Record<string, string> = {
                "content-type": "application/json",
            };
            const accessTokenTtlSeconds = claims.ttlSeconds;
            const refreshedToken = await commitVerifiedSession(
                completeSession,
                {
                    accountId: claims.sub,
                    role: claims.role,
                    ttlSeconds: accessTokenTtlSeconds,
                    providerId: claims.providerId,
                    isAssuranceCurrent: () => {
                        const current =
                            capabilities.get<
                                (
                                    request: IncomingMessage,
                                ) => { sub: string } | null
                            >("auth:getAuthClaims")?.(req);
                        return (
                            current?.sub === claims.sub &&
                            (!lifetime || lifetime.isCurrent(revision!))
                        );
                    },
                },
                res,
                log,
            );
            if (!refreshedToken) return true;
            responseHeaders["set-cookie"] = buildCookie(
                req,
                refreshedToken,
                accessTokenTtlSeconds,
            );
            responseData.token = refreshedToken;
            responseData.accountId = claims.sub;
            responseData.role = claims.role;
            responseData.providerId = claims.providerId;
            responseData.ttlSeconds = accessTokenTtlSeconds;
            res.writeHead(200, responseHeaders);
            res.end(JSON.stringify({ data: responseData }));
            return true;
        }

        const setupCancelMatch = url.pathname.match(
            /^\/api\/v1\/tfa\/methods\/([^/]+)\/setup\/cancel$/,
        );
        if (setupCancelMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const body = await readJson(req);
            const setupId = String(body.setupId ?? "").trim();
            if (setupId) {
                await gateway.cancelMethodSetup(claims.sub, setupId);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { cancelled: true } }));
            return true;
        }

        const disableMatch = url.pathname.match(
            /^\/api\/v1\/tfa\/methods\/([^/]+)\/disable$/,
        );
        if (disableMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const methodId = decodeURIComponent(disableMatch[1]);
            const target = await authorizeTargetAccount({
                ...targetContext,
                claims,
            });
            if (!target || !target.check()) return true;
            const targetAccountId = target.accountId;
            await gateway.disableMethod(targetAccountId, methodId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        const enableMatch = url.pathname.match(
            /^\/api\/v1\/tfa\/methods\/([^/]+)\/enable$/,
        );
        if (enableMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const methodId = decodeURIComponent(enableMatch[1]);
            const target = await authorizeTargetAccount({
                ...targetContext,
                claims,
            });
            if (!target || !target.check()) return true;
            const targetAccountId = target.accountId;
            const enabled = await gateway.enableMethod(
                targetAccountId,
                methodId,
            );
            if (!enabled) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "method_not_configured",
                            message: "method_not_configured",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        const detailsMatch = url.pathname.match(
            /^\/api\/v1\/tfa\/methods\/([^/]+)\/details$/,
        );
        if (detailsMatch && req.method === "GET") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const methodId = decodeURIComponent(detailsMatch[1]);
            const details = await gateway.getMethodDetails(
                claims.sub,
                methodId,
            );
            if (!details) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "method_details_unavailable",
                            message: "method_details_unavailable",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: details }));
            return true;
        }

        if (
            url.pathname === "/api/v1/tfa/methods/preferences" &&
            req.method === "PUT"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const body = await readJson(req);
            const preferredMethodIds = Array.isArray(body.methodIds)
                ? body.methodIds
                      .filter(
                          (methodId: unknown) => typeof methodId === "string",
                      )
                      .map((methodId: string) => methodId.trim())
                      .filter(Boolean)
                : [];
            const target = await authorizeTargetAccount({
                ...targetContext,
                claims,
            });
            if (!target || !target.check()) return true;
            const targetAccountId = target.accountId;
            await gateway.setPreferredMethods(
                targetAccountId,
                preferredMethodIds,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/tfa/recovery-codes" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const target = await authorizeTargetAccount({
                ...targetContext,
                claims,
            });
            if (!target || !target.check()) return true;
            const targetAccountId = target.accountId;
            const recoveryStatus =
                await gateway.getRecoveryCodesStatus(targetAccountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: recoveryStatus }));
            return true;
        }

        if (
            url.pathname === "/api/v1/tfa/recovery-codes/rotate" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const target = await authorizeTargetAccount({
                ...targetContext,
                claims,
            });
            if (!target || !target.check()) return true;
            const targetAccountId = target.accountId;
            const codes = await gateway.generateRecoveryCodes(targetAccountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { recoveryCodes: codes } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/tfa/recovery-codes/status" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const target = await authorizeTargetAccount({
                ...targetContext,
                claims,
            });
            if (!target || !target.check()) return true;
            const targetAccountId = target.accountId;
            const available = await gateway.hasRecoveryCodes(targetAccountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { available } }));
            return true;
        }

        const adminResetMatch = url.pathname.match(
            /^\/api\/v1\/tfa\/admin\/users\/([^/]+)\/reset$/,
        );
        if (adminResetMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const target = await authorizeTargetAccount({
                ...targetContext,
                claims,
                encodedAccountId: adminResetMatch[1],
            });
            if (!target || !target.check()) return true;
            const accountId = target.accountId;
            await gateway.resetUser(accountId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { reset: true } }));
            log?.("warn", "Admin reset user TFA state.", {
                ...logMeta,
                accountId: claims.sub,
                targetAccountId: accountId,
            });
            return true;
        }

        if (
            url.pathname === "/api/v1/tfa/enforcement" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const enforceAllUsers = await gateway.getEnforceAllUsers();
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { enforceAllUsers } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/tfa/enforcement" &&
            req.method === "PUT"
        ) {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = await readJson(req);
            if (typeof body.enforceAllUsers !== "boolean") {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({ error: { code: "invalid_tfa_policy" } }),
                );
                return true;
            }
            const enforceAllUsers = body.enforceAllUsers;
            try {
                await capabilities.require<ApplyEnforcementPolicy>(
                    "tfa:applyEnforcementPolicy",
                )({ required: enforceAllUsers });
            } catch (error) {
                log?.("error", "Could not update mandatory TFA enforcement.", {
                    ...logMeta,
                    operation: "applyEnforcementPolicy",
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                });
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "tfa_policy_unavailable" },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { enforceAllUsers } }));
            return true;
        }

        return false;
    };
}
