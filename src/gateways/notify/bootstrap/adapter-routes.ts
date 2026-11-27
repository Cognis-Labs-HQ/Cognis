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
) {
    const ctx = resolveRouteContext(routeContext);
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === base && request.method === "GET") {
            if (!ctx.requireAuth(request, response, "admin")) return true;
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
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

            if (request.method === "GET") {
                if (!ctx.requireAuth(request, response, "admin")) return true;
                const contract = gateway.getSenderAdminContract(adapterId);
                if (!contract) {
                    response.writeHead(404, {
                        "content-type": "application/json",
                    });
                    response.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Adapter not found or has no config",
                            },
                        }),
                    );
                    return true;
                }
                response.writeHead(200, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        data: contract.config,
                        schema: contract.schema,
                        testSchema: contract.testSchema,
                        stringsBaseUrl: contract.stringsBaseUrl,
                        configuredSecretFields: contract.configuredSecretFields,
                        envValues: contract.envValues,
                        requiredFields: contract.requiredFields,
                        supportsTest: contract.supportsTest,
                    }),
                );
                return true;
            }

            if (request.method === "PUT") {
                if (!ctx.requireAuth(request, response, "admin")) return true;
                const body = await readJson(request);
                await gateway.saveProviderConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                response.writeHead(200, { "content-type": "application/json" });
                response.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }

            return false;
        }

        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (toggleMatch && request.method === "POST") {
            if (!ctx.requireAuth(request, response, "admin")) return true;
            const adapterId = decodeURIComponent(toggleMatch[1]);
            const action = toggleMatch[2] as "enable" | "disable";
            const contract = gateway.getSenderAdminContract(adapterId);
            if (!gateway.hasSender(adapterId)) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                    response.writeHead(409, {
                        "content-type": "application/json",
                    });
                    response.end(
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
                if (contract?.locked) {
                    response.writeHead(403, {
                        "content-type": "application/json",
                    });
                    response.end(
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
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: { enabled: action === "enable" },
                }),
            );
            return true;
        }

        return false;
    };
}
