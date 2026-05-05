import { requireAuth } from "../../auth/guard.js";
import type { GatewayRegistry } from "../../gateway-registry.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { UIRegistry } from "../../ui-registry.js";

/**
 * Creates route handlers for the gateway management API.
 *
 *   GET  /api/v1/gateways                — list all registered gateways (admin)
 *   GET  /api/v1/gateways/:id            — get a single gateway manifest (admin)
 *   POST /api/v1/gateways/:id/enable     — mark gateway as active (admin)
 *   POST /api/v1/gateways/:id/disable    — mark gateway as disabled (admin)
 *   GET  /api/v1/admin/sections          — list UI registry sections contributed by gateways (admin)
 */
export function createGatewayRoutes(
    registry: GatewayRegistry,
    uiRegistry?: UIRegistry,
    persistGatewayState?: (
        gatewayId: string,
        enabled: boolean,
    ) => Promise<void>,
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === "/api/v1/gateways" && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: registry.list() }));
            return true;
        }

        if (url.pathname === "/api/v1/admin/sections" && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({ data: uiRegistry?.listAdminSections() ?? [] }),
            );
            return true;
        }

        const singleMatch = url.pathname.match(
            /^\/api\/v1\/gateways\/([^/]+)$/,
        );
        if (singleMatch && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            const id = decodeURIComponent(singleMatch[1]);
            const manifest = registry.get(id);
            if (!manifest) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Gateway not found",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: manifest }));
            return true;
        }

        const actionMatch = url.pathname.match(
            /^\/api\/v1\/gateways\/([^/]+)\/(enable|disable)$/,
        );
        if (actionMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const id = decodeURIComponent(actionMatch[1]);
            const action = actionMatch[2] as "enable" | "disable";
            const entry = registry.get(id);
            if (!entry) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Gateway not found",
                        },
                    }),
                );
                return true;
            }
            if (entry.required) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "required_gateway",
                            message: "Required gateways cannot be toggled",
                        },
                    }),
                );
                return true;
            }
            if (action === "enable") {
                registry.enable(id);
            } else {
                registry.disable(id);
            }
            await persistGatewayState?.(id, action === "enable");
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        status: action === "enable" ? "active" : "disabled",
                    },
                }),
            );
            return true;
        }

        return false;
    };
}
