import type { IncomingMessage, ServerResponse } from "node:http";
import { buildGatewayAdapterAdminControls } from "../../../api/reuse/adapter-admin-controls.js";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { sendCalendarError, sendJson } from "./helpers.js";
import type { CoreCalendarGateway } from "../gateway/index.js";
import type { GatewayBootstrapContext } from "../shared.js";

export function createCalendarAdapterRoutes(
    gatewayId: string,
    gateway: CoreCalendarGateway,
    gatewayRegistry: GatewayBootstrapContext["gatewayRegistry"],
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
            sendJson(response, 200, {
                data: gateway.listAdapters().map((adapter) => ({
                    ...adapter,
                    controls: buildGatewayAdapterAdminControls(
                        base,
                        adapter.id,
                    ),
                })),
            });
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            if (!ctx.requireAuth(request, response, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);

            if (request.method === "GET") {
                const config = gateway.getAdapterConfig(adapterId);
                if (config === null) {
                    sendCalendarError(
                        response,
                        "not_found",
                        "Adapter not found.",
                        404,
                    );
                    return true;
                }
                sendJson(response, 200, {
                    data: config,
                    envValues: {},
                    requiredFields: [],
                    supportsTest: false,
                });
                return true;
            }

            if (request.method === "PUT") {
                if (!gateway.getAdapter(adapterId)) {
                    sendCalendarError(
                        response,
                        "not_found",
                        "Adapter not found.",
                        404,
                    );
                    return true;
                }
                const body = await readJson(request);
                await gateway.saveAdapterConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                sendJson(response, 200, { data: { saved: true } });
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
            if (!gateway.getAdapter(adapterId)) {
                sendCalendarError(
                    response,
                    "not_found",
                    "Adapter not found.",
                    404,
                );
                return true;
            }
            if (action === "enable") {
                const gatewayEntry = gatewayRegistry.get(gatewayId);
                if (gatewayEntry?.status === "disabled") {
                    sendCalendarError(
                        response,
                        "gateway_disabled",
                        "Cannot enable an adapter while its gateway is disabled",
                        409,
                    );
                    return true;
                }
                await gateway.enableAdapter(adapterId);
            } else {
                await gateway.disableAdapter(adapterId);
            }
            sendJson(response, 200, { data: { enabled: action === "enable" } });
            return true;
        }

        return false;
    };
}
