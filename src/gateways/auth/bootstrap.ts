import path from "node:path";
import {
    requireAuth,
    readJson,
    CapabilityStore,
    type GatewayBootstrapContext,
} from "../shared.js";
import {
    issueAccessToken,
    isTokenVerificationFresh,
    recordTokenVerification,
    type AccessRole,
} from "../../api/auth/access-tokens.js";
import { DbLocalAccountStore } from "../../adapters/auth/local/store.js";
import { CoreAuthGateway } from "./gateway.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthProviderAdapter } from "./gateway.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";
import type { UserPreferenceStore } from "../../api/reuse/preference-store.js";

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

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const dbExecutor = (ctx.capabilities.get<DbExecutor>("db:executor") ??
        ctx.dbExecutor)!;
    const dbType =
        ctx.capabilities.get<SupportedDbType>("db:type") ??
        ctx.dbType ??
        "sqlite";

    const accountStore = new DbLocalAccountStore(dbExecutor, dbType);
    await accountStore.ensureSchema();

    const authGateway = new CoreAuthGateway(dbExecutor, dbType);
    await authGateway.ensureSchema();

    const localAdapterPath = path.resolve(
        process.cwd(),
        "src",
        "adapters",
        "auth",
        "local",
        "index.ts",
    );
    try {
        const mod = await import(`${localAdapterPath}?t=${Date.now()}`);
        if (typeof mod.createAdapter === "function") {
            const localAdapter = mod.createAdapter(accountStore);
            authGateway.setLocalAdapter(localAdapter);
        }
    } catch {
        // Local adapter not found — auth gateway operates without it
    }

    const authAdaptersRoot = path.join(ctx.adaptersRoot, "auth");
    await authGateway.discoverAdapters(authAdaptersRoot);
    await authGateway.loadPersistedConfigs();

    ctx.routeRegistry.register(
        createAuthGatewayRoutes(authGateway, accountStore, ctx.capabilities),
        "auth",
    );
    ctx.routeRegistry.register(
        createAdapterAdminRoutes("auth", authGateway),
        "auth",
    );

    ctx.gatewayRegistry.register({
        id: "auth",
        name: "Authentication Gateway",
        version: "1.3.0",
        description: "Manages authentication providers and user login.",
        publisher: "Cognis Labs",
        required: true,
        hasAdapters: true,
    });

    const uiDir = path.resolve(process.cwd(), "src", "gateways", "auth", "ui");
    ctx.uiRegistry?.registerAdminSection({
        id: "security",
        label: "Security",
        scriptUrl: "/static/gateways/auth/admin-section.js",
    });
    ctx.uiRegistry?.registerStaticDir("auth", uiDir);

    ctx.capabilities.contribute("auth:accountStore", accountStore);
    ctx.capabilities.contribute(
        "auth:createLocalAdmin",
        async (username: string, password: string) => {
            const localAdapter = authGateway.getLocalAdapter();
            if (!localAdapter) throw new Error("local_adapter_unavailable");
            const has = await accountStore.has(username);
            if (!has) {
                await localAdapter.register(username, password, true);
            }
        },
    );
    ctx.capabilities.contribute("auth:getLoginMethods", () =>
        authGateway
            .getEnabledAdapters()
            .map((a) => ({ id: a.id, name: a.name })),
    );
}

function createAuthGatewayRoutes(
    authGateway: CoreAuthGateway,
    accountStore: InstanceType<typeof DbLocalAccountStore>,
    capabilities: CapabilityStore,
) {
    async function readSecuritySettings(): Promise<{
        registrationsEnabled: boolean;
        userValidationMode: "none" | "smtp";
    }> {
        const prefStore =
            capabilities.get<UserPreferenceStore>("preferences:store");
        if (!prefStore) {
            return {
                registrationsEnabled: false,
                userValidationMode: "none",
            };
        }
        const raw = await prefStore.get("__system__", "security-settings");
        if (!raw) {
            return {
                registrationsEnabled: false,
                userValidationMode: "none",
            };
        }
        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            return {
                registrationsEnabled:
                    typeof parsed.registrationsEnabled === "boolean"
                        ? parsed.registrationsEnabled
                        : false,
                userValidationMode:
                    parsed.userValidationMode === "smtp" ? "smtp" : "none",
            };
        } catch {
            return {
                registrationsEnabled: false,
                userValidationMode: "none",
            };
        }
    }

    async function registrationsEnabled(): Promise<boolean> {
        const isPublicRegistrationEnabled = capabilities.get<() => boolean>(
            "registration:public:isEnabled",
        );
        return Boolean(isPublicRegistrationEnabled?.());
    }

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/auth/login-methods" &&
            req.method === "GET"
        ) {
            const methods = authGateway.getEnabledAdapters().map((a) => ({
                id: a.id,
                name: a.name,
            }));
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: methods }));
            return true;
        }

        if (
            url.pathname === "/api/v1/auth/registration-config" &&
            req.method === "GET"
        ) {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        registrationsEnabled: await registrationsEnabled(),
                    },
                }),
            );
            return true;
        }

        if (url.pathname === "/api/v1/auth/register" && req.method === "POST") {
            if (!(await registrationsEnabled())) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "registrations_disabled",
                            message: "Open registration is disabled",
                        },
                    }),
                );
                return true;
            }
            const body = await readJson(req);
            const username = String(body.username ?? "");
            const password = String(body.password ?? "");
            const email = String(body.email ?? "");
            const displayName = String(body.displayName ?? "").trim();
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
            const registerPublic = capabilities.get<
                (input: {
                    username: string;
                    password: string;
                    email?: string;
                    displayName?: string;
                }) => Promise<{
                    username: string;
                    isAdmin: boolean;
                    enabled: boolean;
                }>
            >("registration:public:register");
            if (!registerPublic) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "registration_unavailable",
                            message: "Public registration is not available",
                        },
                    }),
                );
                return true;
            }
            const result = await registerPublic({
                username,
                password,
                email,
                displayName: displayName || undefined,
            });
            const verifyToken = issueAccessToken(
                result.username,
                result.isAdmin ? "admin" : "user",
                1800,
            );

            const hasVerifiedEmail = capabilities.get<
                (accountId: string) => Promise<boolean>
            >("notify:hasVerifiedEmail");
            if (hasVerifiedEmail) {
                const FIVE_MINUTES_MS = 5 * 60 * 1000;
                const timer = setTimeout(async () => {
                    try {
                        const verified = await hasVerifiedEmail(
                            result.username,
                        );
                        if (!verified) {
                            await accountStore.delete(result.username);
                            console.info(
                                JSON.stringify({
                                    level: "info",
                                    component: "auth-gateway",
                                    message:
                                        "Deleted unverified account after 5-minute window.",
                                    accountId: result.username,
                                }),
                            );
                        }
                    } catch {
                        // Cleanup errors are non-fatal.
                    }
                }, FIVE_MINUTES_MS);
                timer.unref();
            }

            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ...result, verifyToken } }));
            return true;
        }

        if (url.pathname === "/api/v1/auth/login" && req.method === "POST") {
            const body = await readJson(req);
            const provider = String(body.provider ?? "local");
            const adapter =
                authGateway.getEnabledAdapter(provider) ??
                authGateway.getEnabledAdapter("local");
            if (!adapter) {
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
            const credentials: Record<string, unknown> = { ...body };
            delete credentials.provider;
            const session = await adapter.authenticate(credentials);
            if (!session) {
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
                ) => Promise<void>
            >("profile:createProfile");
            await createProfile?.(session.accountId, session.accountId, role);
            const isFounder = await accountStore
                .isFounder(session.accountId)
                .catch((error) => {
                    console.warn(
                        JSON.stringify({
                            level: "warn",
                            component: "auth-gateway",
                            message:
                                "Failed to resolve founder status during login.",
                            accountId: session.accountId,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        }),
                    );
                    // Founder status only affects optional UI routing; keep login available on lookup failure.
                    return false;
                });
            const securitySettings = await readSecuritySettings();
            const canSendVerificationEmail = capabilities.get<() => boolean>(
                "notify:canSendVerificationEmail",
            );
            const isInitialAdmin = role === "admin" && isFounder;
            const shouldRequireSmtpValidation =
                securitySettings.userValidationMode === "smtp" &&
                !isInitialAdmin;
            const requiresUserValidation = shouldRequireSmtpValidation
                ? Boolean(canSendVerificationEmail?.())
                : false;
            res.writeHead(200, {
                "content-type": "application/json",
                "set-cookie": `cognis_access_token=${apiToken}; Path=/; HttpOnly; SameSite=Lax`,
            });
            res.end(
                JSON.stringify({
                    data: {
                        accountId: session.accountId,
                        displayName: session.accountId,
                        provider: session.provider,
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

        if (url.pathname === "/api/v1/auth/verify" && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const authHeader = req.headers.authorization;
            const rawToken =
                typeof authHeader === "string" &&
                authHeader.startsWith("Bearer ")
                    ? authHeader.slice("Bearer ".length)
                    : "";
            const oneHourMs = 60 * 60 * 1000;
            if (rawToken && isTokenVerificationFresh(rawToken, oneHourMs)) {
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

        if (
            url.pathname === "/api/v1/auth/emergency-token" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const ttlSeconds = 60 * 60;
            const token = issueAccessToken(claims.sub, "admin", ttlSeconds);
            const expiresAt = new Date(
                Date.now() + ttlSeconds * 1000,
            ).toISOString();
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        token,
                        role: "admin",
                        ttlSeconds,
                        expiresAt,
                    },
                }),
            );
            return true;
        }

        return false;
    };
}

function createAdapterAdminRoutes(
    gatewayId: string,
    authGateway: CoreAuthGateway,
) {
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === base && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: authGateway.listAdapters() }));
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            const adapterId = decodeURIComponent(configMatch[1]);
            const adapter = authGateway.getAdapter(adapterId);

            if (req.method === "GET") {
                if (!requireAuth(req, res, "admin")) return true;
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
                const storedConfig =
                    await authGateway.getPersistedConfig(adapterId);
                const schema = adapter.getConfigSchema();
                const requiredFields = schema
                    .filter((f) => f.required)
                    .map((f) => f.key);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: storedConfig,
                        schema,
                        requiredFields,
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!requireAuth(req, res, "admin")) return true;
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
                const body = await readJson(req);
                await authGateway.saveAdapterConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }
        }

        const enableMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (enableMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(enableMatch[1]);
            const action = enableMatch[2];
            if (adapterId === "local" && action === "disable") {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "locked_adapter",
                            message:
                                "The local authentication adapter cannot be disabled",
                        },
                    }),
                );
                return true;
            }
            if (!authGateway.getAdapter(adapterId)) {
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
                await authGateway.enableAdapter(adapterId);
            } else {
                await authGateway.disableAdapter(adapterId);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        return false;
    };
}
