import {
    buildAccessTokenCookie,
    extractBearerToken,
    extractCookieToken,
    shouldSetSecureCookie,
} from "../../../../api/reuse/access-token-http.js";
import {
    issueAccessToken,
    revokeAccessToken,
} from "../../access-tokens.js";
import type { CoreAuthGateway } from "../../gateway.js";
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
import type { Ctx } from "@cognis/core";
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
        methods: Array<{ id: string; name: string }>;
        integrations: Array<{
            id: string;
            scriptUrl: string;
            stringsBaseUrl?: string | string[];
        }>;
    }> {
        const fallbackMethods = authGateway.getEnabledAdapters().map(
            (adapter) => ({
                id: adapter.id,
                name: adapter.name,
            }),
        );
        if (!systemCtx.flow.exists("construct-login-ui")) {
            return { methods: fallbackMethods, integrations: [] };
        }
        const result = await systemCtx.flow.run("construct-login-ui");
        const methodById = new Map<string, { id: string; name: string }>();
        for (const stageResult of [
            ...(result.stageResults["resolve-methods"] ?? []),
            ...(result.stageResults["augment-methods"] ?? []),
        ]) {
            const methods =
                (stageResult as { methods?: unknown[] })?.methods ?? [];
            for (const method of methods) {
                const id = String((method as { id?: unknown })?.id ?? "").trim();
                const name = String(
                    (method as { name?: unknown })?.name ?? "",
                ).trim();
                if (!id || !name) continue;
                methodById.set(id, { id, name });
            }
        }
        const integrationById = new Map<
            string,
            { id: string; scriptUrl: string; stringsBaseUrl?: string | string[] }
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

    function resolveFlowSessionResult(flowResult: {
        data: Record<string, unknown>;
        stageResults: Record<string, unknown[]>;
    }): LoginFlowSessionResult | null {
        const dataSessionResult = flowResult.data["sessionResult"];
        if (dataSessionResult && typeof dataSessionResult === "object") {
            return dataSessionResult as LoginFlowSessionResult;
        }
        const establishStageResults =
            flowResult.stageResults["establish-session"] ?? [];
        for (let index = establishStageResults.length - 1; index >= 0; index -= 1) {
            const stageResult = establishStageResults[index] as
                | { sessionResult?: unknown }
                | undefined;
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
            const systemCtx = capabilities.get<Ctx>("system:ctx");
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
            const systemCtx = capabilities.get<Ctx>("system:ctx");
            const data = systemCtx
                ? await resolveLoginUiConfig(systemCtx)
                : {
                      methods: authGateway
                          .getEnabledAdapters()
                          .map((adapter) => ({
                              id: adapter.id,
                              name: adapter.name,
                          })),
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

        if (url.pathname === "/api/v1/auth/login" && req.method === "POST") {
            const body = await readJson(req);
            const provider = String(body.provider ?? "local");

            const credentials: Record<string, unknown> = { ...body };
            delete credentials.provider;

            const systemCtx = capabilities.get<Ctx>("system:ctx");
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
