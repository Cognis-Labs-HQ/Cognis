import path from "node:path";
import { requireAuth } from "../../auth/guard.js";
import { readJson } from "../../routes/read-json.js";
import { issueAccessToken, type AccessRole } from "../../auth/access-tokens.js";
import { DbLocalAccountStore } from "../../adapters/db/account-store.js";
import { CoreAuthGateway } from "./gateway.js";
import type { GatewayBootstrapContext } from "../../gateway-bootstrap.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthProviderAdapter } from "./gateway.js";

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
    const accountStore = new DbLocalAccountStore(ctx.dbExecutor, ctx.dbType);
    await accountStore.ensureSchema();

    const authGateway = new CoreAuthGateway(ctx.dbExecutor, ctx.dbType);
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

    const createProfile = ctx.capabilities.get<
        (accountId: string, handle: string, role?: string) => Promise<void>
    >("profile:createProfile");

    ctx.routeRegistry.register(
        createAuthGatewayRoutes(authGateway, accountStore, createProfile),
    );
    ctx.routeRegistry.register(createAdapterAdminRoutes("auth", authGateway));

    ctx.gatewayRegistry.register({
        id: "auth",
        name: "Authentication Gateway",
        version: "1.0.0",
        description: "Manages authentication providers and user login.",
        publisher: "Cognis Labs",
        required: true,
        hasAdapters: true,
    });

    const uiDir = path.resolve(
        process.cwd(),
        "src",
        "api",
        "gateways",
        "auth",
        "ui",
    );
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
    createProfile?: (
        accountId: string,
        handle: string,
        role?: string,
    ) => Promise<void>,
) {
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

        if (url.pathname === "/api/v1/auth/register" && req.method === "POST") {
            const body = await readJson(req);
            const username = String(body.username ?? "");
            const password = String(body.password ?? "");
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
            const localAdapter = authGateway.getLocalAdapter();
            if (!localAdapter) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "local_auth_unavailable",
                            message: "Local registration is not available",
                        },
                    }),
                );
                return true;
            }
            const result = await localAdapter.register(
                username,
                password,
                false,
            );
            await createProfile?.(username, username, "user");
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: result }));
            return true;
        }

        if (url.pathname === "/api/v1/auth/login" && req.method === "POST") {
            const body = await readJson(req);
            const provider = String(body.provider ?? "local");
            const adapter =
                authGateway.getAdapter(provider) ??
                authGateway.getAdapter("local");
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
            await createProfile?.(session.accountId, session.accountId, role);
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
                        token: apiToken,
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
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: { schema: adapter.getConfigSchema() },
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
