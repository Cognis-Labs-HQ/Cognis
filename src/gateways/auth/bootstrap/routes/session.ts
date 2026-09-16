import {
    buildAccessTokenCookie,
    extractBearerToken,
    extractCookieToken,
    shouldSetSecureCookie,
} from "../../../../api/reuse/access-token-http.js";
import { issueAccessToken, revokeAccessToken } from "../../access-tokens.js";
import type { CoreAuthGateway } from "../../gateway.js";
import {
    parseAuthLoginButton,
    type AuthLoginButtonDescriptor,
} from "../../login-button.js";
import type {
    AuthAccountStore,
    AuthRouteBootstrapRuntime,
    SecuritySettings,
} from "../index.js";
import {
    readJson,
    requireAuth,
    type CapabilityStore,
} from "../../../shared.js";
import { CTX_CAPABILITY, type Ctx } from "@cognis/core";
import type { GatewayBootstrapContext } from "../../../shared.js";
import type {
    AuthGatewayRouteHandler,
    AuthRouteLogMeta,
    LoginFlowSessionResult,
} from "./shared.js";

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
    readSecuritySettings: _readSecuritySettings,
    log,
}: SessionRouteDependencies): AuthGatewayRouteHandler {
    async function resolveLoginUiConfig(systemCtx: Ctx): Promise<{
        methods: Array<{
            id: string;
            name: string;
            forgotPassword?: boolean;
            credential?: boolean;
            loginButton?: AuthLoginButtonDescriptor;
        }>;
        integrations: Array<{
            id: string;
            scriptUrl: string;
            stringsBaseUrl?: string | string[];
        }>;
    }> {
        const fallbackMethods = authGateway
            .getEnabledAdapters()
            .flatMap((adapter) =>
                (
                    adapter.getLoginMethods?.() ?? [
                        { id: adapter.id, name: adapter.name },
                    ]
                ).map((method) => ({
                    ...method,
                    forgotPassword:
                        adapter.getLoginUiCapabilities?.().forgotPassword ===
                        true,
                })),
            );
        if (!systemCtx.flow.exists("construct-login-ui")) {
            return { methods: fallbackMethods, integrations: [] };
        }
        const result = await systemCtx.flow.run("construct-login-ui");
        const methodById = new Map<
            string,
            {
                id: string;
                name: string;
                forgotPassword?: boolean;
                credential?: boolean;
                loginButton?: AuthLoginButtonDescriptor;
            }
        >();
        for (const stageResult of [
            ...(result.stageResults["resolve-methods"] ?? []),
            ...(result.stageResults["augment-methods"] ?? []),
        ]) {
            const methods =
                (stageResult as { methods?: unknown[] })?.methods ?? [];
            for (const method of methods) {
                const id = String(
                    (method as { id?: unknown })?.id ?? "",
                ).trim();
                const name = String(
                    (method as { name?: unknown })?.name ?? "",
                ).trim();
                if (!id || !name) continue;
                const loginButton = parseAuthLoginButton(
                    (method as { loginButton?: unknown }).loginButton,
                    id,
                );
                const existingMethod = methodById.get(id);
                methodById.set(id, {
                    ...existingMethod,
                    id,
                    name,
                    forgotPassword:
                        (method as { forgotPassword?: unknown })
                            .forgotPassword === undefined
                            ? (existingMethod?.forgotPassword ?? false)
                            : (method as { forgotPassword?: unknown })
                                  .forgotPassword === true,
                    credential:
                        (method as { credential?: unknown }).credential ===
                        undefined
                            ? (existingMethod?.credential ?? false)
                            : (method as { credential?: unknown })
                                  .credential === true,
                    ...(loginButton ? { loginButton } : {}),
                });
            }
        }
        const integrationById = new Map<
            string,
            {
                id: string;
                scriptUrl: string;
                stringsBaseUrl?: string | string[];
            }
        >();
        for (const stageResult of result.stageResults["compose-form"] ?? []) {
            const integrations =
                (stageResult as { integrations?: unknown[] })?.integrations ??
                [];
            for (const integration of integrations) {
                const id = String(
                    (integration as { id?: unknown })?.id ?? "",
                ).trim();
                const scriptUrl = String(
                    (integration as { scriptUrl?: unknown })?.scriptUrl ?? "",
                ).trim();
                if (!id || !scriptUrl) continue;
                const stringsBaseUrl = (
                    integration as {
                        stringsBaseUrl?: string | string[];
                    }
                ).stringsBaseUrl;
                integrationById.set(id, { id, scriptUrl, stringsBaseUrl });
            }
        }
        return {
            methods:
                methodById.size > 0
                    ? Array.from(methodById.values())
                    : fallbackMethods,
            integrations: Array.from(integrationById.values()),
        };
    }

    function resolveSsoAuthorizationUrl(
        flowResult: {
            stageResults: Record<string, unknown[]>;
        },
        providerId: string,
    ): string | null {
        for (const stageResult of flowResult.stageResults[
            "initiateAuthorization"
        ] ?? []) {
            if (
                !stageResult ||
                typeof stageResult !== "object" ||
                Array.isArray(stageResult)
            ) {
                continue;
            }
            const result = stageResult as {
                providerId?: unknown;
                redirectUrl?: unknown;
            };
            if (result.providerId !== providerId) continue;
            const redirectUrl = String(result.redirectUrl ?? "").trim();
            if (!redirectUrl) continue;
            if (
                (redirectUrl.startsWith("/") &&
                    !redirectUrl.startsWith("//")) ||
                (URL.canParse(redirectUrl) &&
                    new URL(redirectUrl).protocol === "https:")
            ) {
                return redirectUrl;
            }
        }
        return null;
    }

    function resolveFlowSessionResult(flowResult: {
        data: Record<string, unknown>;
        stageResults: Record<string, unknown[]>;
    }): LoginFlowSessionResult | null {
        const flowDataSessionResult = flowResult.data["sessionResult"];
        if (
            flowDataSessionResult &&
            typeof flowDataSessionResult === "object"
        ) {
            return flowDataSessionResult as LoginFlowSessionResult;
        }
        const establishStageResults =
            flowResult.stageResults["establish-session"] ?? [];
        // Walk newest-first so later gateway hooks can override earlier
        // `sessionResult` values in the same establish-session stage.
        for (
            let index = establishStageResults.length - 1;
            index >= 0;
            index -= 1
        ) {
            const stageResult = establishStageResults[index] as
                { sessionResult?: unknown } | undefined;
            if (
                stageResult?.sessionResult &&
                typeof stageResult.sessionResult === "object"
            ) {
                return stageResult.sessionResult as LoginFlowSessionResult;
            }
        }
        return null;
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
        if (outcome === "account_creation_required") {
            log?.("info", "Held external login for account authorization.", {
                ...logMeta,
                emailRequired: sessionResult.emailRequired === true,
            });
            res.writeHead(403, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "account_creation_required",
                        message:
                            "Account registration authorization is required.",
                    },
                    data: {
                        emailRequired: sessionResult.emailRequired === true,
                        registrationTokenRequired: true,
                        retryEndpoint: "/api/v1/auth/login",
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
            const ttlSeconds =
                sessionResult.ttlSeconds === undefined
                    ? 0
                    : sessionResult.ttlSeconds;
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
                        ttlSeconds,
                        userValidationMode: sessionResult.userValidationMode,
                        requiredUserValidation:
                            sessionResult.requiredUserValidation,
                        tfaSetupRequired: true,
                    },
                }),
            );
            return true;
        }
        if (outcome === "account_archived") {
            const code = outcome;
            log?.(
                "warn",
                "Login denied for inactive account lifecycle state.",
                {
                    ...logMeta,
                    outcome,
                },
            );
            res.writeHead(403, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code,
                        message:
                            "Your account is archived. Contact an administrator to restore access.",
                    },
                }),
            );
            return true;
        }
        if (outcome === "success") {
            const token = sessionResult.token ?? "";
            const ttlSeconds =
                sessionResult.ttlSeconds === undefined
                    ? 0
                    : sessionResult.ttlSeconds;
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
                        ttlSeconds,
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
            const systemCtx = capabilities.get<Ctx>(CTX_CAPABILITY);
            const methods = systemCtx
                ? (await resolveLoginUiConfig(systemCtx)).methods
                : authGateway.getEnabledAdapters().map((adapter) => ({
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

        if (url.pathname === "/api/v1/auth/login-ui" && req.method === "GET") {
            const systemCtx = capabilities.get<Ctx>(CTX_CAPABILITY);
            const data = systemCtx
                ? await resolveLoginUiConfig(systemCtx)
                : {
                      methods: authGateway
                          .getEnabledAdapters()
                          .flatMap((adapter) =>
                              (
                                  adapter.getLoginMethods?.() ?? [
                                      { id: adapter.id, name: adapter.name },
                                  ]
                              ).map((method) => ({
                                  ...method,
                                  forgotPassword:
                                      adapter.getLoginUiCapabilities?.()
                                          .forgotPassword === true,
                              })),
                          ),
                      integrations: [],
                  };
            log?.("debug", "Resolved login UI flow configuration.", {
                ...logMeta,
                methodCount: data.methods.length,
                integrationCount: data.integrations.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/sso/start" &&
            req.method === "POST"
        ) {
            const body = await readJson(req);
            const providerId = String(body.providerId ?? "").trim();
            const systemCtx = capabilities.get<Ctx>(CTX_CAPABILITY);
            const method = systemCtx
                ? (await resolveLoginUiConfig(systemCtx)).methods.find(
                      (candidate) => candidate.id === providerId,
                  )
                : undefined;
            if (
                !systemCtx?.flow.exists("startSsoLogin") ||
                !method?.loginButton
            ) {
                log?.("warn", "Rejected unavailable SSO login provider.", {
                    ...logMeta,
                    providerId,
                });
                res.writeHead(422, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "sso_provider_unavailable",
                            message: "SSO provider is unavailable.",
                        },
                    }),
                );
                return true;
            }
            let flowResult;
            try {
                flowResult = await systemCtx.flow.run("startSsoLogin", {
                    providerId,
                });
            } catch (error) {
                log?.("error", "SSO authorization flow failed.", {
                    ...logMeta,
                    providerId,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                res.writeHead(502, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "sso_authorization_unavailable",
                            message: "SSO authorization is unavailable.",
                        },
                    }),
                );
                return true;
            }
            const redirectUrl = resolveSsoAuthorizationUrl(
                flowResult,
                providerId,
            );
            if (!redirectUrl) {
                log?.("error", "SSO authorization did not return a redirect.", {
                    ...logMeta,
                    providerId,
                });
                res.writeHead(502, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "sso_authorization_unavailable",
                            message: "SSO authorization is unavailable.",
                        },
                    }),
                );
                return true;
            }
            log?.("info", "Started SSO authorization.", {
                ...logMeta,
                providerId,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { redirectUrl } }));
            return true;
        }

        if (url.pathname === "/api/v1/auth/login" && req.method === "POST") {
            const body = await readJson(req);
            const provider = String(body.provider ?? "local");

            const credentials: Record<string, unknown> = { ...body };
            delete credentials.provider;

            const systemCtx = capabilities.get<Ctx>(CTX_CAPABILITY);
            if (systemCtx?.flow.exists("login")) {
                const result = await systemCtx.flow.run("login", {
                    provider,
                    credentials,
                });
                const sessionResult = resolveFlowSessionResult(result);
                if (sessionResult) {
                    return dispatchLoginFlowResult(
                        req,
                        res,
                        sessionResult,
                        logMeta,
                    );
                }
                log?.("warn", "Login flow did not produce a session outcome.", {
                    ...logMeta,
                    provider,
                });
                res.writeHead(500, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "internal_error",
                            message:
                                "An unexpected error occurred during login.",
                        },
                    }),
                );
                return true;
            }

            log?.(
                "error",
                "Login flow is unavailable because canonical flow registration is missing.",
                { ...logMeta, provider },
            );
            res.writeHead(503, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "login_unavailable",
                        message: "Login flow is temporarily unavailable",
                    },
                }),
            );
            return true;
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
