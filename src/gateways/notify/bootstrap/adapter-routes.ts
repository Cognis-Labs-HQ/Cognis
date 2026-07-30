import { readJson, type GatewayRegistry } from "../../shared.js";
import { CoreNotificationGateway } from "../gateway.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { buildGatewayAdapterAdminControls } from "../../../api/reuse/adapter-admin-controls.js";
import type { IncomingMessage, ServerResponse } from "node:http";

export function createGatewayAdapterRoutes(
    gatewayId: string,
    gateway: CoreNotificationGateway,
    gatewayRegistry: GatewayRegistry,
    routeContext?: RouteContext,
    sendEmail?: (input: {
        recipientEmail: string;
        templateId: string;
        variables: Record<string, string>;
        config?: Record<string, unknown>;
    }) => Promise<unknown>,
    log?: (
        level: string,
        message: string,
        metadata?: Record<string, unknown>,
    ) => void,
) {
    const ctx = resolveRouteContext(routeContext);
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === base && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: gateway.listSenders().map((sender) => ({
                        ...sender,
                        controls: buildGatewayAdapterAdminControls(
                            base,
                            sender.senderId,
                            {
                                includeTest: sender.supportsTest === true,
                            },
                        ),
                    })),
                }),
            );
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            const adapterId = decodeURIComponent(configMatch[1]);

            if (req.method === "GET") {
                if (!ctx.requireAuth(req, res, "admin")) return true;
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
                const sender = gateway.getSender(adapterId);
                res.end(
                    JSON.stringify({
                        data: config,
                        envValues:
                            gateway.getProviderEnvValues(adapterId) ?? {},
                        requiredFields:
                            gateway.getProviderRequiredFields(adapterId) ?? [],
                        supportsTest:
                            typeof sender?.sendTestEmail === "function",
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!ctx.requireAuth(req, res, "admin")) return true;
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

        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (toggleMatch && req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(toggleMatch[1]);
            const action = toggleMatch[2] as "enable" | "disable";
            const sender = gateway.getSender(adapterId);
            if (!sender) {
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
                const gatewayEntry = gatewayRegistry.get(gatewayId);
                if (gatewayEntry?.status === "disabled") {
                    res.writeHead(409, {
                        "content-type": "application/json",
                    });
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
                await gateway.enableSender(adapterId);
            } else {
                if (sender.locked) {
                    res.writeHead(403, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "locked_adapter",
                                message:
                                    "This adapter is always-on and cannot be disabled",
                            },
                        }),
                    );
                    return true;
                }
                await gateway.disableSender(adapterId);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { enabled: action === "enable" },
                }),
            );
            return true;
        }

        const testMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/test$`),
        );
        if (testMatch && req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(testMatch[1]);
            const body = await readJson(req);
            const to = String(body.to ?? "");
            const overrideConfig =
                body.config != null &&
                typeof body.config === "object" &&
                !Array.isArray(body.config)
                    ? (body.config as Record<string, unknown>)
                    : undefined;
            if (adapterId !== "smtp" || !sendEmail) {
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
            try {
                await sendEmail({
                    recipientEmail: to,
                    templateId: "notify-test",
                    variables: {},
                    config: overrideConfig,
                });
            } catch (error) {
                log?.("error", "SMTP test email failed.", {
                    component: "notify-smtp",
                    operation: "send_test_email",
                    recipientEmail: to,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                res.writeHead(400, {
                    "content-type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "smtp_test_failed",
                            message:
                                "SMTP test email could not be sent. Verify the server, security mode, sender, and authentication settings.",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { sent: true } }));
            return true;
        }

        return false;
    };
}
