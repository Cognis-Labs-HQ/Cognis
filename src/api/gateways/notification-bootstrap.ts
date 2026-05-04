import path from "node:path";
import { requireAuth } from "../auth/guard.js";
import { readJson } from "../routes/read-json.js";
import {
    CoreNotificationGateway,
    VolatileNotificationPreferenceStore,
} from "./notification.js";
import {
    DbNotificationStore,
    DbNotificationPreferenceStore,
} from "../adapters/db/notification-store.js";
import type {
    DbExecutor,
    SupportedDbType,
} from "../adapters/db/account-store.js";
import type { RouteRegistry } from "../route-registry.js";
import type { GatewayRegistry } from "../gateway-registry.js";
import { createNotificationRoutes } from "../routes/notifications/index.js";
import type { IncomingMessage, ServerResponse } from "node:http";

export interface NotificationGatewayBootstrapContext {
    dbExecutor: DbExecutor;
    dbType: SupportedDbType;
    adaptersRoot: string;
    routeRegistry: RouteRegistry;
    gatewayRegistry: GatewayRegistry;
}

export interface NotificationGatewayBootstrapResult {
    gateway: CoreNotificationGateway;
    notifStore: DbNotificationStore;
}

/**
 * Bootstraps the notification gateway.
 *
 * Creates the DB stores, discovers notification adapters from the adapters
 * directory, loads persisted configs, registers system notification categories,
 * records the gateway in the gateway registry, and self-registers all
 * notification routes — including the unified gateway adapter API at
 * /api/v1/gateways/notify/adapters — with the route registry.
 *
 * Returns the gateway instance (used by core user routes as
 * VerificationEmailSender) and the notifStore (used by user routes for
 * email management).
 */
export async function bootstrapNotificationGateway(
    ctx: NotificationGatewayBootstrapContext,
): Promise<NotificationGatewayBootstrapResult> {
    const notifStore = new DbNotificationStore(ctx.dbExecutor, ctx.dbType);
    await notifStore.ensureSchema();

    const notificationPrefStore = new DbNotificationPreferenceStore(notifStore);
    const gateway = new CoreNotificationGateway(
        notificationPrefStore,
        notifStore,
        notifStore,
    );

    const notifyAdaptersRoot = path.join(ctx.adaptersRoot, "notify");
    await gateway.discoverSenders(notifyAdaptersRoot);
    await gateway.loadPersistedConfigs();
    gateway.registerCategory("system", "System Notifications");

    ctx.gatewayRegistry.register({
        id: "notify",
        name: "Notification Gateway",
        version: "0.1.0",
        description: "Dispatches notifications via pluggable adapter senders.",
        publisher: "Cognis Labs",
    });

    ctx.routeRegistry.register(createNotificationRoutes(gateway, notifStore));
    ctx.routeRegistry.register(createGatewayAdapterRoutes("notify", gateway));

    return { gateway, notifStore };
}

function createGatewayAdapterRoutes(
    gatewayId: string,
    gateway: CoreNotificationGateway,
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
            res.end(JSON.stringify({ data: gateway.listSenders() }));
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            const adapterId = decodeURIComponent(configMatch[1]);

            if (req.method === "GET") {
                if (!requireAuth(req, res, "admin")) return true;
                const config = gateway.getProviderConfig(adapterId);
                if (config === null) {
                    res.writeHead(404, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found or has no config",
                            },
                        }),
                    );
                    return true;
                }
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: config,
                        envValues:
                            gateway.getProviderEnvValues(adapterId) ?? {},
                        requiredFields:
                            gateway.getProviderRequiredFields(adapterId) ?? [],
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!requireAuth(req, res, "admin")) return true;
                const body = await readJson(req);
                await gateway.saveProviderConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }

            return false;
        }

        const testMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/test$`),
        );
        if (testMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(testMatch[1]);
            const body = await readJson(req);
            const to = String(body.to ?? "");
            const overrideConfig =
                body.config != null &&
                typeof body.config === "object" &&
                !Array.isArray(body.config)
                    ? (body.config as Record<string, unknown>)
                    : undefined;
            const sender = gateway.getSender(adapterId);
            if (!sender || typeof sender.sendTestEmail !== "function") {
                res.writeHead(400, {
                    "content-type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_supported",
                            message: "Adapter does not support test emails",
                        },
                    }),
                );
                return true;
            }
            await sender.sendTestEmail(to, overrideConfig);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { sent: true } }));
            return true;
        }

        return false;
    };
}
