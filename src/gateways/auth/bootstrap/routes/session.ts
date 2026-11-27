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
        request: import("node:http").IncomingMessage,
        response: import("node:http").ServerResponse,
        sessionResult: LoginFlowSessionResult,
        logMetadata: AuthRouteLogMeta,
        responseCookies: string[] = [],
    ): true {
        const appendResponseCookie = (cookie: string): string | string[] =>
            responseCookies.length > 0 ? [...responseCookies, cookie] : cookie;
        const outcome = sessionResult.outcome;
        if (outcome === "provider_unavailable") {
            log?.("warn", "Login failed: provider unavailable (flow).", {
                ...logMetadata,
            });
            response.writeHead(503, { "content-type": "application/json" });
            response.end(
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
                ...logMetadata,
            });
            response.writeHead(401, { "content-type": "application/json" });
            response.end(
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
            const authorizationFailureReason = String(
                sessionResult.authorizationFailureReason ?? "",
            ).trim();
            const pending = sessionResult.pendingAccountCreation;
            const attempt = pending
                ? authRouteBootstrapRuntime.createPendingAccountCreationAttempt(
                      {
                          ...pending,
                          emailRequired: sessionResult.emailRequired === true,
                      },
                  )
                : null;
            log?.("info", "Held external login for account authorization.", {
                ...logMetadata,
                emailRequired: sessionResult.emailRequired === true,
            });
            response.writeHead(403, {
                "content-type": "application/json",
                ...(attempt
                    ? {
                          "set-cookie":
                              authRouteBootstrapRuntime.buildPendingAccountCreationCookie(
                                  request,
                                  attempt.id,
                              ),
                      }
                    : {}),
            });
            response.end(
                JSON.stringify({
                    error: {
                        code:
                            authorizationFailureReason ||
                            "account_creation_required",
                        message: authorizationFailureReason
                            ? "Account registration authorization failed."
                            : "Account registration authorization is required.",
                    },
                    data: {
                        emailRequired: sessionResult.emailRequired === true,
                        registrationTokenRequired: true,
                        ...(attempt
                            ? {
                                  registrationUrl: "/register",
                              }
                            : {}),
                    },
                }),
            );
            return true;
        }
        if (outcome === "tfa_unavailable") {
            log?.(
                "warn",
                "Login denied because configured TFA challenges are unavailable (flow).",
                { ...logMetadata },
            );
            response.writeHead(503, { "content-type": "application/json" });
            response.end(
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
                ...logMetadata,
                accountId: sessionResult.accountId,
                provider: sessionResult.provider,
                role: sessionResult.role,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
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
                    ...logMetadata,
                    accountId: sessionResult.accountId,
                    provider: sessionResult.provider,
                    role: sessionResult.role,
                },
            );
            response.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": appendResponseCookie(
                    authRouteBootstrapRuntime.buildAccessTokenCookie(
                        request,
                        token,
                        ttlSeconds,
                    ),
                ),
            });
            response.end(
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
                    ...logMetadata,
                    outcome,
                },
            );
            response.writeHead(403, { "content-type": "application/json" });
            response.end(
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
                ...logMetadata,
                accountId: sessionResult.accountId,
                provider: sessionResult.provider,
                role: sessionResult.role,
                requiresUserValidation: sessionResult.requiredUserValidation,
            });
            response.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": appendResponseCookie(
                    authRouteBootstrapRuntime.buildAccessTokenCookie(
                        request,
                        token,
                        ttlSeconds,
                    ),
                ),
            });
            response.end(
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
            ...logMetadata,
            outcome,
        });
        response.writeHead(500, { "content-type": "application/json" });
        response.end(
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
        request,
        response,
        url,
        logMetadata: AuthRouteLogMeta,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/auth/login-methods" &&
            request.method === "GET"
        ) {
            const systemCtx = capabilities.get<Ctx>(CTX_CAPABILITY);
            const methods = systemCtx
                ? (await resolveLoginUiConfig(systemCtx)).methods
                : authGateway.getEnabledAdapters().map((adapter) => ({
                      id: adapter.id,
                      name: adapter.name,
                  }));
            log?.("debug", "Listed login methods.", {
                ...logMetadata,
                count: methods.length,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: methods }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/login-ui" &&
            request.method === "GET"
        ) {
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
                ...logMetadata,
                methodCount: data.methods.length,
                integrationCount: data.integrations.length,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/sso/start" &&
            request.method === "POST"
        ) {
            const body = await readJson(request);
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
                    ...logMetadata,
                    providerId,
                });
                response.writeHead(422, { "content-type": "application/json" });
                response.end(
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
                    ...logMetadata,
                    providerId,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                response.writeHead(502, { "content-type": "application/json" });
                response.end(
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
                    ...logMetadata,
                    providerId,
                });
                response.writeHead(502, { "content-type": "application/json" });
                response.end(
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
                ...logMetadata,
                providerId,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { redirectUrl } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/account-creation-attempt" &&
            request.method === "GET"
        ) {
            const attemptId =
                authRouteBootstrapRuntime.extractPendingAccountCreationAttemptId(
                    request,
                );
            const attempt = attemptId
                ? authRouteBootstrapRuntime.getPendingAccountCreationAttempt(
                      attemptId,
                  )
                : null;
            if (!attempt) {
                response.writeHead(200, {
                    "content-type": "application/json",
                    ...(attemptId
                        ? {
                              "set-cookie":
                                  authRouteBootstrapRuntime.clearPendingAccountCreationCookie(
                                      request,
                                  ),
                          }
                        : {}),
                });
                response.end(JSON.stringify({ data: null }));
                return true;
            }
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: {
                        emailRequired: attempt.emailRequired,
                        expiresAt: attempt.expiresAt,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/account-creation-attempt" &&
            request.method === "DELETE"
        ) {
            const attemptId =
                authRouteBootstrapRuntime.extractPendingAccountCreationAttemptId(
                    request,
                );
            if (attemptId) {
                authRouteBootstrapRuntime.clearPendingAccountCreationAttempt(
                    attemptId,
                );
            }
            response.writeHead(204, {
                "set-cookie":
                    authRouteBootstrapRuntime.clearPendingAccountCreationCookie(
                        request,
                    ),
            });
            response.end();
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/login" &&
            request.method === "POST"
        ) {
            const body = await readJson(request);
            const provider = String(body.provider ?? "local");
            const accountCreationAttemptId = body.registrationToken
                ? (authRouteBootstrapRuntime.extractPendingAccountCreationAttemptId(
                      request,
                  ) ?? "")
                : "";
            const pendingAccountCreation = accountCreationAttemptId
                ? authRouteBootstrapRuntime.getPendingAccountCreationAttempt(
                      accountCreationAttemptId,
                  )
                : null;
            if (accountCreationAttemptId && !pendingAccountCreation) {
                response.writeHead(410, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "account_creation_attempt_expired",
                            message:
                                "Account registration authorization has expired.",
                        },
                    }),
                );
                return true;
            }

            const credentials: Record<string, unknown> = { ...body };
            delete credentials.provider;

            const systemCtx = capabilities.get<Ctx>(CTX_CAPABILITY);
            if (systemCtx?.flow.exists("login")) {
                const result = await systemCtx.flow.run("login", {
                    provider: pendingAccountCreation?.providerId ?? provider,
                    credentials,
                    ...(pendingAccountCreation
                        ? {
                              authenticatedSession:
                                  pendingAccountCreation.session,
                          }
                        : {}),
                });
                const sessionResult = resolveFlowSessionResult(result);
                if (sessionResult) {
                    const responseCookies: string[] = [];
                    if (
                        accountCreationAttemptId &&
                        sessionResult.outcome !== "account_creation_required"
                    ) {
                        authRouteBootstrapRuntime.clearPendingAccountCreationAttempt(
                            accountCreationAttemptId,
                        );
                        responseCookies.push(
                            authRouteBootstrapRuntime.clearPendingAccountCreationCookie(
                                request,
                            ),
                        );
                    }
                    return dispatchLoginFlowResult(
                        request,
                        response,
                        sessionResult,
                        logMetadata,
                        responseCookies,
                    );
                }
                log?.("warn", "Login flow did not produce a session outcome.", {
                    ...logMetadata,
                    provider,
                });
                response.writeHead(500, { "content-type": "application/json" });
                response.end(
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
                { ...logMetadata, provider },
            );
            response.writeHead(503, { "content-type": "application/json" });
            response.end(
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
            request.method === "GET"
        ) {
            const claims = requireAuth(request, response, "user");
            if (!claims) return true;
            const guest = capabilities.get<
                (claims: { sub: string }) => string | null
            >("share:resolveGuestId")?.(claims);
            if (guest) {
                response.writeHead(200, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        data: { integrations: [], requiresSetup: false },
                    }),
                );
                return true;
            }
            const getTfaUserStatus =
                capabilities.get<
                    (accountId: string) => Promise<{ requiresSetup: boolean }>
                >("tfa:getUserStatus");
            const status = getTfaUserStatus
                ? await getTfaUserStatus(claims.sub).catch(() => null)
                : null;
            const getIntegrations = capabilities.get<
                (
                    accountId: string,
                    role: string,
                ) => Promise<Array<{ scriptUrl: string }>>
            >("auth:getSetupIntegrations");
            // Limited TFA setup tokens cannot access other owners' setup APIs.
            const integrations =
                getIntegrations && status?.requiresSetup !== true
                    ? await getIntegrations(claims.sub, claims.role)
                    : [];
            const getAccountInstanceId = capabilities.get<
                (accountId: string) => Promise<string>
            >("auth:getAccountInstanceId");
            if (!getAccountInstanceId)
                throw new Error("account_instance_unavailable");
            const accountInstanceId = await getAccountInstanceId(claims.sub);
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: {
                        accountInstanceId,
                        integrations,
                        requiresSetup: status?.requiresSetup === true,
                    },
                }),
            );
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/emergency-token" &&
            request.method === "POST"
        ) {
            const claims = requireAuth(request, response, "admin");
            if (!claims) return true;
            const ttlSeconds = 60 * 60;
            const token = issueAccessToken(claims.sub, claims.role, ttlSeconds);
            const expiresAt = new Date(
                Date.now() + ttlSeconds * 1000,
            ).toISOString();
            log?.("warn", "Issued emergency API token.", {
                ...logMetadata,
                accountId: claims.sub,
                role: claims.role,
                ttlSeconds,
                expiresAt,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
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

        if (
            url.pathname === "/api/v1/auth/logout" &&
            request.method === "POST"
        ) {
            const cookieToken = extractCookieToken(request);
            if (cookieToken) {
                revokeAccessToken(cookieToken);
            }
            const bearerToken = extractBearerToken(request);
            if (bearerToken && bearerToken !== cookieToken) {
                revokeAccessToken(bearerToken);
            }
            log?.("info", "User logged out.", {
                ...logMetadata,
                hadCookieToken: Boolean(cookieToken),
                hadBearerToken: Boolean(bearerToken),
            });
            response.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": buildAccessTokenCookie(
                    "",
                    0,
                    shouldSetSecureCookie(request),
                ),
            });
            response.end(JSON.stringify({ data: { success: true } }));
            return true;
        }

        return false;
    };
}
