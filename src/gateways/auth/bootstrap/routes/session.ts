import {
    buildAccessTokenCookie,
    extractBearerToken,
    extractCookieToken,
    shouldSetSecureCookie,
} from "../../../../api/reuse/access-token-http.js";
import {
    issueAccessToken,
    revokeAccessToken,
    type AccessRole,
} from "../../access-tokens.js";
import type { CoreAuthGateway } from "../../gateway.js";
import type {
    AuthAccountStore,
    AuthRouteBootstrapRuntime,
    SecuritySettings,
} from "../index.js";
import { resolveRole } from "../local-account.js";
import {
    readJson,
    requireAuth,
    type CapabilityStore,
} from "../../../shared.js";
import type { Ctx } from "@cognis/core";
import type { GatewayBootstrapContext } from "../../../shared.js";
import type { AuthGatewayRouteHandler, AuthRouteLogMeta } from "./shared.js";

interface SessionRouteDependencies {
    authGateway: CoreAuthGateway;
    accountStore: AuthAccountStore;
    capabilities: CapabilityStore;
    authRouteBootstrapRuntime: AuthRouteBootstrapRuntime;
    readSecuritySettings: () => Promise<SecuritySettings>;
    log?: GatewayBootstrapContext["log"];
}

export function createSessionRoutes({
    authGateway,
    accountStore,
    capabilities,
    authRouteBootstrapRuntime,
    readSecuritySettings,
    log,
}: SessionRouteDependencies): AuthGatewayRouteHandler {
    async function respondToSuccessfulLogin(
        req: import("node:http").IncomingMessage,
        res: import("node:http").ServerResponse,
        session: {
            accountId: string;
            provider: string;
            role?: string;
        },
        providerId: string,
        logMeta: AuthRouteLogMeta,
    ): Promise<true> {
        let role: AccessRole = resolveRole(session.role);
        const profileStore = capabilities.get<{
            getProfile(accountId: string): Promise<{ role?: string } | null>;
        }>("social:profileStore");
        if (profileStore) {
            const existingProfile = await profileStore
                .getProfile(session.accountId)
                .catch(() => null);
            if (existingProfile?.role === "owner") {
                role = "owner";
            }
        }
        const isFounder = await accountStore
            .isFounder(session.accountId)
            .catch((error) => {
                log?.(
                    "warn",
                    "Failed to resolve founder status during login.",
                    {
                        component: "auth-gateway",
                        accountId: session.accountId,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                );
                return false;
            });
        if (isFounder && (role === "admin" || role === "owner")) {
            role = "owner";
        }
        const accessTokenTtlSeconds =
            authRouteBootstrapRuntime.getAccessTokenTtlSeconds();
        const localAdapter = authGateway.getLocalAdapter();
        if (localAdapter) {
            await localAdapter
                .updateLastLogin(session.accountId)
                .catch(() => undefined);
        }
        const createProfile = capabilities.get<
            (
                accountId: string,
                handle: string,
                role?: string,
                displayName?: string,
            ) => Promise<void>
        >("profile:createProfile");
        const accountDisplayName =
            (await accountStore.getDisplayName(session.accountId))?.trim() ||
            undefined;
        await createProfile?.(
            session.accountId,
            session.accountId,
            role,
            accountDisplayName,
        );
        const securitySettings = await readSecuritySettings();
        const canSendVerificationEmail = capabilities.get<() => boolean>(
            "notify:canSendVerificationEmail",
        );
        const isInitialAdmin =
            (role === "admin" || role === "owner") && isFounder;
        const shouldRequireSmtpValidation =
            securitySettings.userValidationMode === "smtp" && !isInitialAdmin;
        const requiresUserValidation = shouldRequireSmtpValidation
            ? Boolean(canSendVerificationEmail?.())
            : false;
        const getTfaUserStatus = capabilities.get<
            (accountId: string) => Promise<{
                requiresSetup: boolean;
                hasConfiguredMethod: boolean;
            }>
        >("tfa:getUserStatus");
        const getTfaLoginMethods = capabilities.get<
            (accountId: string) => Promise<Array<{ id: string; name: string }>>
        >("tfa:getLoginMethods");
        const tfaStatus = getTfaUserStatus
            ? await getTfaUserStatus(session.accountId).catch(() => null)
            : null;
        const requiresTfa = tfaStatus?.hasConfiguredMethod === true;
        const requiresTfaSetup = tfaStatus?.requiresSetup === true;
        if (requiresTfa) {
            const methods = getTfaLoginMethods
                ? await getTfaLoginMethods(session.accountId)
                      .catch(() => [])
                      .then((items) =>
                          items.filter(
                              (item) =>
                                  typeof item.id === "string" &&
                                  typeof item.name === "string",
                          ),
                      )
                : [];
            if (methods.length > 0) {
                const pendingAttempt =
                    authRouteBootstrapRuntime.createPendingTfaLoginAttempt({
                        accountId: session.accountId,
                        role,
                        isFounder,
                        provider: session.provider,
                        providerId,
                        displayName: accountDisplayName ?? session.accountId,
                        userValidationMode: securitySettings.userValidationMode,
                        requiredUserValidation: requiresUserValidation,
                    });
                log?.("info", "Login entered TFA challenge flow.", {
                    ...logMeta,
                    accountId: session.accountId,
                    provider: session.provider,
                    role,
                    methodCount: methods.length,
                });
                res.writeHead(200, {
                    "content-type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        data: {
                            tfaRequired: true,
                            loginAttemptId: pendingAttempt.id,
                            methods,
                            accountId: session.accountId,
                            displayName:
                                accountDisplayName ?? session.accountId,
                            provider: session.provider,
                            providerId,
                            role,
                            isFounder,
                            userValidationMode:
                                securitySettings.userValidationMode,
                            requiredUserValidation: requiresUserValidation,
                        },
                    }),
                );
                return true;
            }
            log?.(
                "warn",
                "Login denied because configured TFA challenges are unavailable.",
                {
                    ...logMeta,
                    accountId: session.accountId,
                    provider: session.provider,
                    role,
                },
            );
            res.writeHead(503, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "tfa_unavailable",
                        message:
                            "Two-factor authentication is temporarily unavailable. Please try again.",
                    },
                }),
            );
            return true;
        }
        if (requiresTfaSetup) {
            const pendingSetupToken = issueAccessToken(
                session.accountId,
                role,
                accessTokenTtlSeconds,
                {
                    providerId,
                    setupPending: true,
                },
            );
            log?.("info", "Login succeeded with pending TFA setup gate.", {
                ...logMeta,
                accountId: session.accountId,
                provider: session.provider,
                role,
            });
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": authRouteBootstrapRuntime.buildAccessTokenCookie(
                    req,
                    pendingSetupToken,
                    accessTokenTtlSeconds,
                ),
            });
            res.end(
                JSON.stringify({
                    data: {
                        accountId: session.accountId,
                        displayName: accountDisplayName ?? session.accountId,
                        provider: session.provider,
                        providerId,
                        role,
                        isFounder,
                        token: pendingSetupToken,
                        userValidationMode: securitySettings.userValidationMode,
                        requiredUserValidation: requiresUserValidation,
                        tfaSetupRequired: true,
                    },
                }),
            );
            return true;
        }
        log?.("info", "Login succeeded.", {
            ...logMeta,
            accountId: session.accountId,
            provider: session.provider,
            role,
            requiresUserValidation,
        });
        const apiToken = issueAccessToken(
            session.accountId,
            role,
            accessTokenTtlSeconds,
            { providerId },
        );
        res.writeHead(200, {
            "content-type": "application/json",
            "set-cookie": authRouteBootstrapRuntime.buildAccessTokenCookie(
                req,
                apiToken,
                accessTokenTtlSeconds,
            ),
        });
        res.end(
            JSON.stringify({
                data: {
                    accountId: session.accountId,
                    displayName: accountDisplayName ?? session.accountId,
                    provider: session.provider,
                    providerId,
                    role,
                    isFounder,
                    token: apiToken,
                    userValidationMode: securitySettings.userValidationMode,
                    requiredUserValidation: requiresUserValidation,
                },
            }),
        );
        return true;
    }

    interface LoginFlowSessionResult {
        outcome: string;
        accountId?: string;
        displayName?: string;
        provider?: string;
        providerId?: string;
        role?: string;
        isFounder?: boolean;
        token?: string;
        ttlSeconds?: number;
        loginAttemptId?: string;
        methods?: unknown[];
        userValidationMode?: string;
        requiredUserValidation?: unknown;
    }

    function dispatchLoginFlowResult(
        req: import("node:http").IncomingMessage,
        res: import("node:http").ServerResponse,
        sessionResult: LoginFlowSessionResult,
        logMeta: AuthRouteLogMeta,
    ): true {
        const outcome = sessionResult.outcome;
        if (outcome === "provider_unavailable") {
            log?.("warn", "Login failed: provider unavailable (flow).", {
                ...logMeta,
            });
            res.writeHead(503, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "provider_unavailable",
                        message: "Auth provider not available",
                    },
                }),
            );
            return true;
        }
        if (outcome === "invalid_credentials") {
            log?.("warn", "Login failed due to invalid credentials (flow).", {
                ...logMeta,
            });
            res.writeHead(401, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "invalid_credentials",
                        message: "Invalid credentials",
                    },
                }),
            );
            return true;
        }
        if (outcome === "tfa_unavailable") {
            log?.(
                "warn",
                "Login denied because configured TFA challenges are unavailable (flow).",
                { ...logMeta },
            );
            res.writeHead(503, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "tfa_unavailable",
                        message:
                            "Two-factor authentication is temporarily unavailable. Please try again.",
                    },
                }),
            );
            return true;
        }
        if (outcome === "tfa_required") {
            log?.("info", "Login entered TFA challenge flow (flow).", {
                ...logMeta,
                accountId: sessionResult.accountId,
                provider: sessionResult.provider,
                role: sessionResult.role,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        tfaRequired: true,
                        loginAttemptId: sessionResult.loginAttemptId,
                        methods: sessionResult.methods,
                        accountId: sessionResult.accountId,
                        displayName: sessionResult.displayName,
                        provider: sessionResult.provider,
                        providerId: sessionResult.providerId,
                        role: sessionResult.role,
                        isFounder: sessionResult.isFounder,
                        userValidationMode: sessionResult.userValidationMode,
                        requiredUserValidation:
                            sessionResult.requiredUserValidation,
                    },
                }),
            );
            return true;
        }
        if (outcome === "tfa_setup_required") {
            const token = sessionResult.token ?? "";
            const ttlSeconds = sessionResult.ttlSeconds ?? 0;
            log?.(
                "info",
                "Login succeeded with pending TFA setup gate (flow).",
                {
                    ...logMeta,
                    accountId: sessionResult.accountId,
                    provider: sessionResult.provider,
                    role: sessionResult.role,
                },
            );
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": authRouteBootstrapRuntime.buildAccessTokenCookie(
                    req,
                    token,
                    ttlSeconds,
                ),
            });
            res.end(
                JSON.stringify({
                    data: {
                        accountId: sessionResult.accountId,
                        displayName: sessionResult.displayName,
                        provider: sessionResult.provider,
                        providerId: sessionResult.providerId,
                        role: sessionResult.role,
                        isFounder: sessionResult.isFounder,
                        token,
                        userValidationMode: sessionResult.userValidationMode,
                        requiredUserValidation:
                            sessionResult.requiredUserValidation,
                        tfaSetupRequired: true,
                    },
                }),
            );
            return true;
        }
        if (outcome === "success") {
            const token = sessionResult.token ?? "";
            const ttlSeconds = sessionResult.ttlSeconds ?? 0;
            log?.("info", "Login succeeded (flow).", {
                ...logMeta,
                accountId: sessionResult.accountId,
                provider: sessionResult.provider,
                role: sessionResult.role,
                requiresUserValidation: sessionResult.requiredUserValidation,
            });
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": authRouteBootstrapRuntime.buildAccessTokenCookie(
                    req,
                    token,
                    ttlSeconds,
                ),
            });
            res.end(
                JSON.stringify({
                    data: {
                        accountId: sessionResult.accountId,
                        displayName: sessionResult.displayName,
                        provider: sessionResult.provider,
                        providerId: sessionResult.providerId,
                        role: sessionResult.role,
                        isFounder: sessionResult.isFounder,
                        token,
                        userValidationMode: sessionResult.userValidationMode,
                        requiredUserValidation:
                            sessionResult.requiredUserValidation,
                    },
                }),
            );
            return true;
        }
        log?.("warn", "Login flow returned unknown outcome.", {
            ...logMeta,
            outcome,
        });
        res.writeHead(500, { "content-type": "application/json" });
        res.end(
            JSON.stringify({
                error: {
                    code: "internal_error",
                    message: "An unexpected error occurred during login.",
                },
            }),
        );
        return true;
    }

    return async (
        req,
        res,
        url,
        logMeta: AuthRouteLogMeta,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/auth/login-methods" &&
            req.method === "GET"
        ) {
            const methods = authGateway.getEnabledAdapters().map((adapter) => ({
                id: adapter.id,
                name: adapter.name,
            }));
            log?.("debug", "Listed login methods.", {
                ...logMeta,
                count: methods.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: methods }));
            return true;
        }

        if (url.pathname === "/api/v1/auth/login" && req.method === "POST") {
            const body = await readJson(req);
            const provider = String(body.provider ?? "local");

            const credentials: Record<string, unknown> = { ...body };
            delete credentials.provider;

            const flowCtx = capabilities.get<Ctx>("system:ctx");
            if (flowCtx?.hasFlow("login")) {
                const result = await flowCtx.runFlow("login", {
                    provider,
                    credentials,
                });
                const sessionResult = result.data["sessionResult"] as
                    | LoginFlowSessionResult
                    | undefined;
                if (sessionResult) {
                    return dispatchLoginFlowResult(
                        req,
                        res,
                        sessionResult,
                        logMeta,
                    );
                }
            }

            const adapter =
                authGateway.getEnabledAdapter(provider) ??
                authGateway.getEnabledAdapter("local");
            if (!adapter) {
                log?.(
                    "warn",
                    "Login failed because no authentication adapter was available.",
                    {
                        ...logMeta,
                        provider,
                    },
                );
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "provider_unavailable",
                            message: "Auth provider not available",
                        },
                    }),
                );
                return true;
            }
            const session = await adapter.authenticate(credentials);
            if (!session) {
                log?.("warn", "Login failed due to invalid credentials.", {
                    ...logMeta,
                    provider,
                });
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_credentials",
                            message: "Invalid credentials",
                        },
                    }),
                );
                return true;
            }
            return respondToSuccessfulLogin(
                req,
                res,
                session,
                adapter.id,
                logMeta,
            );
        }

        if (
            url.pathname === "/api/v1/auth/setup-status" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const getTfaUserStatus =
                capabilities.get<
                    (accountId: string) => Promise<{ requiresSetup: boolean }>
                >("tfa:getUserStatus");
            const status = getTfaUserStatus
                ? await getTfaUserStatus(claims.sub).catch(() => null)
                : null;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        requiresSetup: status?.requiresSetup === true,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/emergency-token" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const ttlSeconds = 60 * 60;
            const token = issueAccessToken(claims.sub, claims.role, ttlSeconds);
            const expiresAt = new Date(
                Date.now() + ttlSeconds * 1000,
            ).toISOString();
            log?.("warn", "Issued emergency API token.", {
                ...logMeta,
                accountId: claims.sub,
                role: claims.role,
                ttlSeconds,
                expiresAt,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        token,
                        role: claims.role,
                        ttlSeconds,
                        expiresAt,
                    },
                }),
            );
            return true;
        }

        if (url.pathname === "/api/v1/auth/logout" && req.method === "POST") {
            const cookieToken = extractCookieToken(req);
            if (cookieToken) {
                revokeAccessToken(cookieToken);
            }
            const bearerToken = extractBearerToken(req);
            if (bearerToken && bearerToken !== cookieToken) {
                revokeAccessToken(bearerToken);
            }
            log?.("info", "User logged out.", {
                ...logMeta,
                hadCookieToken: Boolean(cookieToken),
                hadBearerToken: Boolean(bearerToken),
            });
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": buildAccessTokenCookie(
                    "",
                    0,
                    shouldSetSecureCookie(req),
                ),
            });
            res.end(JSON.stringify({ data: { success: true } }));
            return true;
        }

        return false;
    };
}
