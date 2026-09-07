import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson, type GatewayRegistry } from "../../shared.js";
import { buildGatewayAdapterAdminControls } from "../../../api/reuse/adapter-admin-controls.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { CoreRegistrationGateway } from "../gateway.js";

export function createGatewayAdapterRoutes(
    gatewayId: string,
    gateway: CoreRegistrationGateway,
    gatewayRegistry: GatewayRegistry,
    routeContext?: RouteContext,
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
                    data: gateway.listAdapters().map((adapter) => ({
                        ...adapter,
                        controls: buildGatewayAdapterAdminControls(
                            base,
                            adapter.id,
                        ),
                    })),
                }),
            );
            return true;
        }

        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (toggleMatch && req.method === "POST") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(toggleMatch[1]);
            const action = toggleMatch[2] as "enable" | "disable";
            const known = gateway
                .listAdapters()
                .some((adapter) => adapter.id === adapterId);
            if (!known) {
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
                await gateway.enableAdapter(adapterId);
            } else {
                await gateway.disableAdapter(adapterId);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { enabled: action === "enable" },
                }),
            );
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);
            const adapter = gateway
                .listAdapters()
                .find((candidate) => candidate.id === adapterId);
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
                    data: { enabled: adapter.enabled },
                    requiredFields: [],
                    schema: [],
                    supportsTest: false,
                }),
            );
            return true;
        }

        if (configMatch && req.method === "PUT") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);
            const adapter = gateway
                .listAdapters()
                .find((candidate) => candidate.id === adapterId);
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
            const config =
                body != null && typeof body === "object" && !Array.isArray(body)
                    ? (body as Record<string, unknown>)
                    : {};
            const enabledValue = config.enabled;

            if (enabledValue === true || enabledValue === "true") {
                const gatewayEntry = gatewayRegistry.get(gatewayId);
                if (gatewayEntry?.status === "disabled") {
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
                await gateway.enableAdapter(adapterId);
            }

            if (enabledValue === false || enabledValue === "false") {
                await gateway.disableAdapter(adapterId);
            }

            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        return false;
    };
}
