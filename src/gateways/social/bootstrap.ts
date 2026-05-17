import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { GatewayBootstrapContext } from "../shared.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import { requireAuth } from "../auth/guard.js";
import { readJson } from "../../api/reuse/read-json.js";
import { DbAdapterConfigStore } from "./adapter-config-store.js";
import { CoreSocialGateway } from "./gateway.js";

export type { SocialAdapterBootstrapCtx, SocialAdapter } from "./gateway.js";
export {
    normalizeHandleKey,
    normalizeHandleKeys,
} from "./reuse/profile-record.js";

/**
 * Route handler for social adapter management. Mirrors the notification
 * gateway adapter controls so Administration sliders persist state and disabled
 * adapters stop serving routes immediately.
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
        if (configMatch) {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);

            if (req.method === "GET") {
                const config = gateway.getAdapterConfig(adapterId);
                if (config === null) {
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
                        data: config,
                        envValues: {},
                        requiredFields: [],
                        supportsTest: false,
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!gateway.getAdapter(adapterId)) {
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
                await gateway.saveAdapterConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }

            return false;
        }

        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (toggleMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(toggleMatch[1]);
            const action = toggleMatch[2] as "enable" | "disable";
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
            if (action === "enable") {
                await gateway.enableAdapter(adapterId);
            } else {
                await gateway.disableAdapter(adapterId);
            }
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
    const dbExecutor =
        ctx.capabilities.get<DbExecutor>("db:executor") ?? ctx.dbExecutor;
    const configStore = new DbAdapterConfigStore(dbExecutor);
    await configStore.ensureSchema();

    const gateway = new CoreSocialGateway(configStore);
    const adaptersRoot = path.join(ctx.adaptersRoot, "social");

    await gateway.discoverAdapters(adaptersRoot);
    await gateway.loadPersistedConfigs();
    ctx.log?.("info", "Social gateway: adapters discovered and configured.", {
        component: "social-gateway",
        adaptersRoot,
        adapterCount: gateway.listAdapters().length,
    });

    await gateway.bootstrapAdapters(adaptersRoot, {
        gateway,
        capabilities: ctx.capabilities,
        gatewayRegistry: ctx.gatewayRegistry,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "social"),
        registerNavbarPlugin: (scriptUrl, isEnabled) =>
            ctx.uiRegistry?.registerNavbarPlugin({ scriptUrl, isEnabled }),
        registerSpaRoute: (route) => ctx.uiRegistry?.registerSpaRoute(route),
        registerStaticDir: (prefix, dir) =>
            ctx.uiRegistry?.registerStaticDir(prefix, dir),
        registerAdapterStaticDir: (gw, ad, dir) =>
            ctx.uiRegistry?.registerAdapterStaticDir(gw, ad, dir),
        registerAuthTypingMessage: (message) =>
            ctx.uiRegistry?.registerAuthTypingMessage(message),
        log: ctx.log,
        dbExecutor,
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
        version: "1.2.1",
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
    ctx.uiRegistry?.registerStaticDir("social", uiDir);

    ctx.log?.("info", "Social gateway: initialized.", {
        component: "social-gateway",
        adaptersRoot,
    });
}
