import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GatewayBootstrapContext } from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";
import { requireAuth } from "../../api/auth/guard.js";
import { CoreSocialGateway, type SocialAdapterInfo } from "./gateway.js";

export type { SocialAdapterBootstrapCtx, SocialAdapter } from "./gateway.js";

/**
 * Route handler for `GET /api/v1/gateways/social/adapters`. Social adapters
 * are always active once bootstrapped and cannot be individually toggled
 * without a restart, so enable/disable actions update the in-memory flag only.
 */
function createSocialAdapterRoutes(
    gatewayId: string,
    gateway: CoreSocialGateway,
    gatewayRegistry: GatewayBootstrapContext["gatewayRegistry"],
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
            res.end(JSON.stringify({ data: gateway.listAdapters() }));
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch && (req.method === "GET" || req.method === "PUT")) {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);
            const adapters = gateway.listAdapters();
            const found = adapters.find(
                (a: SocialAdapterInfo) => a.id === adapterId,
            );
            if (!found) {
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
                    data: {},
                    envValues: {},
                    requiredFields: [],
                    supportsTest: false,
                }),
            );
            return true;
        }

        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (toggleMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(toggleMatch[1]);
            const action = toggleMatch[2] as "enable" | "disable";
            const adapters = gateway.listAdapters();
            const adapter = adapters.find(
                (a: SocialAdapterInfo) => a.id === adapterId,
            );
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
                const gwEntry = gatewayRegistry.get(gatewayId);
                if (gwEntry?.status === "disabled") {
                    res.writeHead(409, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "gateway_disabled",
                                message:
                                    "Cannot enable an adapter while its gateway is disabled",
                            },
                        }),
                    );
                    return true;
                }
            }
            // Social adapters boot once at process start. Toggling `active`
            // updates the admin UI immediately; the adapter keeps running until
            // the server restarts. Full lifecycle teardown is a separate effort.
            gateway.setAdapterActive(adapterId, action === "enable");
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { enabled: action === "enable" } }));
            return true;
        }

        return false;
    };
}

/**
 * Standard gateway bootstrap entry point for the Social Gateway.
 */
export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const gateway = new CoreSocialGateway();
    const adaptersRoot = path.join(ctx.adaptersRoot, "social");

    await gateway.bootstrapAdapters(adaptersRoot, {
        gateway,
        capabilities: ctx.capabilities,
        gatewayRegistry: ctx.gatewayRegistry,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "social"),
        registerNavbarPlugin: (scriptUrl) =>
            ctx.uiRegistry?.registerNavbarPlugin({ scriptUrl }),
        registerStaticDir: (prefix, dir) =>
            ctx.uiRegistry?.registerStaticDir(prefix, dir),
        registerAdapterStaticDir: (gw, ad, dir) =>
            ctx.uiRegistry?.registerAdapterStaticDir(gw, ad, dir),
        registerAuthTypingMessage: (message) =>
            ctx.uiRegistry?.registerAuthTypingMessage(message),
        log: ctx.log,
        dbExecutor:
            ctx.capabilities.get<DbExecutor>("db:executor") ?? ctx.dbExecutor,
        dbType: ctx.capabilities.get<SupportedDbType>("db:type") ?? ctx.dbType,
        isGatewayEnabled: () =>
            ctx.gatewayRegistry.get("social")?.status !== "disabled",
    });

    ctx.log?.("info", "Social gateway: adapters bootstrapped.", {
        component: "social-gateway",
        adaptersRoot,
        adapterCount: gateway.listAdapters().length,
    });

    ctx.routeRegistry.register(
        createSocialAdapterRoutes("social", gateway, ctx.gatewayRegistry),
        "social",
    );

    ctx.gatewayRegistry.register({
        id: "social",
        name: "Social Gateway",
        version: "1.2.0",
        description: "Profiles, social graph, posts, and messaging.",
        publisher: "Cognis Labs",
        hasAdapters: true,
    });

    const uiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "social",
        "ui",
    );
    ctx.uiRegistry?.registerAdminSection({
        id: "social",
        label: "Social",
        scriptUrl: "/static/gateways/social/admin-section.js",
    });
    ctx.uiRegistry?.registerStaticDir("social", uiDir);

    ctx.log?.("info", "Social gateway: initialized.", {
        component: "social-gateway",
        adaptersRoot,
    });
}
