import { readdir } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
    getAuthClaims,
    readJson,
    registerLimitedAuthPathAllowance,
    requireAuth,
    type GatewayBootstrapContext,
} from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import { DbTfaStore } from "./reuse/tfa-store.js";
import { CoreTfaGateway } from "./gateway.js";

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const dbExecutor =
        ctx.capabilities.get<DbExecutor>("db:executor") ?? ctx.dbExecutor;
    if (!dbExecutor) {
        throw new Error("db_executor_unavailable");
    }

    const store = new DbTfaStore(dbExecutor);
    await store.ensureSchema();

    const dispatchNotification =
        ctx.capabilities.get<
            (envelope: {
                category: string;
                recipientUsername: string;
                subject: string;
                body: string;
                metadata?: Record<string, unknown>;
            }) => Promise<unknown>
        >("notify:dispatch");
    const canSendVerificationEmail = ctx.capabilities.get<() => boolean>(
        "notify:canSendVerificationEmail",
    );
    const sendVerificationEmail = ctx.capabilities.get<
        (
            to: string,
            code: string,
            verifyUrl?: string,
            theme?: string,
        ) => Promise<void>
    >("notify:sendVerificationEmail");
    const getPrimaryEmail = ctx.capabilities.get<
        (accountId: string) => Promise<string | null>
    >("notify:getPrimaryEmail");
    const registerNotificationCategory = ctx.capabilities.get<
        (id: string, label: string) => void
    >("notify:registerCategory");
    const gateway = new CoreTfaGateway(store, {
        dispatchNotification,
        adapterFactoryContext: {
            canSendVerificationEmail,
            sendVerificationEmail,
            getPrimaryEmail,
            log: ctx.log,
        },
        log: ctx.log,
    });
    const revokeSetupPendingAccessTokens = ctx.capabilities.get<
        (excludedSubject?: string) => number
    >("auth:revokeSetupPendingAccessTokens");
    const tfaAdaptersRoot = path.join(ctx.adaptersRoot, "tfa");
    await gateway.discoverAdapters(tfaAdaptersRoot);
    await gateway.loadPersistedConfigs();
    ctx.routeRegistry.register(
        createTfaRoutes(gateway, ctx.capabilities, ctx.log),
        "tfa",
    );
    ctx.routeRegistry.register(
        createTfaAdapterAdminRoutes(gateway, ctx.log),
        "tfa",
    );
    if (typeof registerNotificationCategory === "function") {
        registerNotificationCategory("security", "Security");
    }

    ctx.gatewayRegistry.register({
        id: "tfa",
        name: "Two-Factor Authentication Gateway",
        version: "1.0.7",
        description:
            "Manages two-factor authentication methods and login checks.",
        publisher: "Cognis Labs HQ",
        required: false,
        hasAdapters: true,
    });
    const gatewayUiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "tfa",
        "ui",
    );
    ctx.uiRegistry?.registerStaticDir("tfa", gatewayUiDir);
    const registerSecuritySection = ctx.capabilities.get<
        (section: {
            id: string;
            scriptUrl: string;
            stringsBaseUrl?: string | string[];
        }) => void
    >("auth:registerSecuritySection");
    registerSecuritySection?.({
        id: "tfa",
        scriptUrl: "/static/gateways/tfa/settings-section.js",
        stringsBaseUrl: [
            "/static/gateways/tfa/languages",
            "/static/adapters/tfa/totp/languages",
            "/static/adapters/tfa/smtp/languages",
        ],
    });
    registerLimitedAuthPathAllowance("tfa", (path, _accountId) => {
        if (path === "/api/v1/tfa/status" || path === "/api/v1/tfa/methods") {
            return true;
        }
        if (path.startsWith("/api/v1/tfa/methods/")) {
            return true;
        }
        if (
            path === "/api/v1/tfa/recovery-codes" ||
            path === "/api/v1/tfa/recovery-codes/rotate"
        ) {
            return true;
        }
        return false;
    });
    const adapterDirs = await readdir(tfaAdaptersRoot, {
        withFileTypes: true,
    }).catch(() => []);
    for (const adapterDir of adapterDirs) {
        if (!adapterDir.isDirectory()) continue;
        ctx.uiRegistry?.registerAdapterStaticDir(
            "tfa",
            adapterDir.name,
            path.join(tfaAdaptersRoot, adapterDir.name),
        );
    }

    ctx.capabilities.contribute(
        "tfa:getUserStatus",
        async (accountId: string) => gateway.getUserStatus(accountId),
    );
    ctx.capabilities.contribute(
        "tfa:getLoginMethods",
        async (accountId: string) => gateway.getLoginMethods(accountId),
    );
    ctx.capabilities.contribute(
        "tfa:verifyLogin",
        async (
            accountId: string,
            methodId: string,
            payload: Record<string, unknown>,
        ) => gateway.verifyLogin(accountId, methodId, payload),
    );
    ctx.capabilities.contribute(
        "tfa:isSecondFactorEnabled",
        async (accountId: string) => gateway.isSecondFactorEnabled(accountId),
    );
    ctx.capabilities.contribute(
        "tfa:isSetupRequired",
        async (accountId: string) => gateway.isSetupRequired(accountId),
    );
    ctx.capabilities.contribute("tfa:resetUser", async (accountId: string) =>
        gateway.resetUser(accountId),
    );
    ctx.capabilities.contribute("tfa:getEnforceAllUsers", async () =>
        gateway.getEnforceAllUsers(),
    );
    ctx.capabilities.contribute(
        "tfa:setEnforceAllUsers",
        async (required: boolean) => gateway.setEnforceAllUsers(required),
    );
    ctx.capabilities.contribute(
        "tfa:applyEnforcementPolicy",
        async (input: { required: boolean; excludedSubject?: string }) => {
            const previousRequired = await gateway.getEnforceAllUsers();
            await gateway.setEnforceAllUsers(input.required);
            let revokedSetupPendingCount = 0;
            if (previousRequired && !input.required) {
                revokedSetupPendingCount =
                    revokeSetupPendingAccessTokens?.(input.excludedSubject) ??
                    0;
            }
            return {
                required: input.required,
                previousRequired,
                revokedSetupPendingCount,
            };
        },
    );

    ctx.log?.("info", "TFA gateway initialized.", {
        component: "tfa-gateway",
        adapterCount: gateway.listAdapters().length,
    });
}

function createTfaRoutes(
    gateway: CoreTfaGateway,
    capabilities: GatewayBootstrapContext["capabilities"],
    log?: GatewayBootstrapContext["log"],
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMeta = {
            component: "tfa-gateway",
            method: req.method ?? "GET",
            path: url.pathname,
        };

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
                    userValidationMode: "none" | "smtp";
                    requiredUserValidation: boolean;
                } | null
            >("tfa:getPendingLoginAttempt");
            const clearPendingLoginAttempt = capabilities.get<
                (loginAttemptId: string) => void
            >("tfa:clearPendingLoginAttempt");
            const issueToken = capabilities.get<
                (
                    subject: string,
                    role: "user" | "teacher" | "moderator" | "admin" | "owner",
                    ttlSeconds: number | null,
                    options?: { issuedAt?: number; providerId?: string },
                ) => string
            >("auth:issueAccessToken");
            const getAccessTokenTtlSeconds = capabilities.get<() => number>(
                "auth:getAccessTokenTtlSeconds",
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
                !clearPendingLoginAttempt ||
                !issueToken ||
                !getAccessTokenTtlSeconds ||
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
            const tfaResult = await gateway
                .verifyLogin(pendingAttempt.accountId, methodId, body)
                .catch(() => ({
                    verified: false,
                    message: "verification_failed",
                }));
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
            clearPendingLoginAttempt(loginAttemptId);
            const accessTokenTtlSeconds = getAccessTokenTtlSeconds();
            const apiToken = issueToken(
                pendingAttempt.accountId,
                pendingAttempt.role as
                    | "user"
                    | "teacher"
                    | "moderator"
                    | "admin"
                    | "owner",
                accessTokenTtlSeconds,
                {
                    providerId: pendingAttempt.providerId,
                },
            );
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
            const status = await gateway.getUserStatus(claims.sub);
            log?.("debug", "Read TFA status.", {
                ...logMeta,
                accountId: claims.sub,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: status }));
            return true;
        }

        if (url.pathname === "/api/v1/tfa/methods" && req.method === "GET") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const status = await gateway.getUserStatus(claims.sub);
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
            const issueToken = capabilities.get<
                (
                    subject: string,
                    role: "user" | "teacher" | "moderator" | "admin" | "owner",
                    ttlSeconds: number | null,
                    options?: {
                        issuedAt?: number;
                        providerId?: string;
                        setupPending?: boolean;
                    },
                ) => string
            >("auth:issueAccessToken");
            const getAccessTokenTtlSeconds = capabilities.get<() => number>(
                "auth:getAccessTokenTtlSeconds",
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
            const responseData: Record<string, unknown> = { verified: true };
            const responseHeaders: Record<string, string> = {
                "content-type": "application/json",
            };
            if (issueToken && getAccessTokenTtlSeconds && buildCookie) {
                const accessTokenTtlSeconds = getAccessTokenTtlSeconds();
                const refreshedToken = issueToken(
                    claims.sub,
                    claims.role,
                    accessTokenTtlSeconds,
                    {
                        providerId: claims.providerId,
                        setupPending: false,
                    },
                );
                responseHeaders["set-cookie"] = buildCookie(
                    req,
                    refreshedToken,
                    accessTokenTtlSeconds,
                );
                responseData.token = refreshedToken;
                responseData.accountId = claims.sub;
                responseData.role = claims.role;
                responseData.providerId = claims.providerId;
            }
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
            await gateway.disableMethod(claims.sub, methodId);
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
            const enabled = await gateway.enableMethod(claims.sub, methodId);
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
            await gateway.setPreferredMethods(claims.sub, preferredMethodIds);
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
            const recoveryStatus = await gateway.getRecoveryCodesStatus(
                claims.sub,
            );
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
            const codes = await gateway.generateRecoveryCodes(claims.sub);
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
            const available = await gateway.hasRecoveryCodes(claims.sub);
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
            const accountId = decodeURIComponent(adminResetMatch[1]);
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
            const enforceAllUsers = body.enforceAllUsers === true;
            await gateway.setEnforceAllUsers(enforceAllUsers);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { enforceAllUsers } }));
            return true;
        }

        return false;
    };
}

function createTfaAdapterAdminRoutes(
    gateway: CoreTfaGateway,
    log?: GatewayBootstrapContext["log"],
) {
    const base = "/api/v1/gateways/tfa/adapters";
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const claims = getAuthClaims(req);
        const logMeta = {
            component: "tfa-gateway",
            method: req.method ?? "GET",
            path: url.pathname,
            accountId: claims?.sub,
        };

        if (url.pathname === base && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: gateway.listAdapters() }));
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);
            const adapter = gateway.getAdapter(adapterId);
            if (!adapter) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Adapter not found",
                        },
                    }),
                );
                return true;
            }
            if (req.method === "GET") {
                const adapterConfig = await gateway.getAdapterConfig(adapterId);
                const schema = adapter.getConfigSchema();
                const configData: Record<string, unknown> = {};
                for (const field of schema) {
                    configData[field.key] = adapterConfig[field.key] ?? null;
                }
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: configData,
                        envValues: {},
                        requiredFields: schema
                            .filter((field) => field.required)
                            .map((field) => field.key),
                        schema,
                        supportsTest: false,
                    }),
                );
                return true;
            }
            if (req.method === "PUT") {
                const body = await readJson(req);
                await gateway.saveAdapterConfig(adapterId, body);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                log?.("info", "Saved TFA adapter config.", {
                    ...logMeta,
                    adapterId,
                });
                return true;
            }
            return false;
        }

        const stateMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (stateMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(stateMatch[1]);
            const action = stateMatch[2];
            const adapter = gateway.getAdapter(adapterId);
            if (!adapter) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Adapter not found",
                        },
                    }),
                );
                return true;
            }
            if (action === "enable") {
                await gateway.enableAdapter(adapterId);
            } else {
                await gateway.disableAdapter(adapterId);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            log?.("warn", "Changed TFA adapter state.", {
                ...logMeta,
                adapterId,
                action,
            });
            return true;
        }

        return false;
    };
}
