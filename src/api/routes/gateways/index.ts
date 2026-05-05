import { requireAuth } from "../../auth/guard.js";
import type { GatewayRegistry } from "../../gateway-registry.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { UIRegistry } from "../../ui-registry.js";

/**
 * Creates route handlers for the gateway management API.
 *
 *   GET /api/v1/gateways         — list all registered gateways (admin)
 *   GET /api/v1/gateways/:id     — get a single gateway manifest (admin)
 *   GET /api/v1/admin/sections   — list UI registry sections contributed by gateways (admin)
 */
export function createGatewayRoutes(
    registry: GatewayRegistry,
    uiRegistry?: UIRegistry,
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

        return false;
    };
}
