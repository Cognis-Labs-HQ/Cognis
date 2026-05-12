import { requireAuth, isRoleAllowed } from "../../../gateways/auth/guard.js";
import type { BootstrapLog, GatewayRegistry } from "@cognis/core";
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
    log?: BootstrapLog,
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMeta = {
            component: "api-gateways",
            method: req.method ?? "GET",
            path: url.pathname,
        };
        if (url.pathname === "/api/v1/gateways" && req.method === "GET") {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            log?.("debug", "Listed gateways.", {
                ...logMeta,
                accountId: claims.sub,
                count: registry.list().length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: registry.list() }));
            return true;
        }

        if (url.pathname === "/api/v1/admin/sections" && req.method === "GET") {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const sections = (uiRegistry?.listAdminSections() ?? []).filter(
                (section) => isRoleAllowed(claims.role, section.access),
            );
            log?.("debug", "Listed admin sections.", {
                ...logMeta,
                accountId: claims.sub,
                count: sections.length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: sections }));
            return true;
        }

        const singleMatch = url.pathname.match(
            /^\/api\/v1\/gateways\/([^/]+)$/,
        );
        if (singleMatch && req.method === "GET") {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const id = decodeURIComponent(singleMatch[1]);
            const manifest = registry.get(id);
            if (!manifest) {
                log?.("warn", "Gateway lookup failed.", {
                    ...logMeta,
                    accountId: claims.sub,
                    gatewayId: id,
                });
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
            log?.("debug", "Read gateway manifest.", {
                ...logMeta,
                accountId: claims.sub,
                gatewayId: id,
                status: manifest.status,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: manifest }));
            return true;
        }

        const actionMatch = url.pathname.match(
            /^\/api\/v1\/gateways\/([^/]+)\/(enable|disable)$/,
        );
        if (actionMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const id = decodeURIComponent(actionMatch[1]);
            const action = actionMatch[2] as "enable" | "disable";
            const entry = registry.get(id);
            if (!entry) {
                log?.(
                    "warn",
                    "Gateway toggle failed because gateway was not found.",
                    {
                        ...logMeta,
                        accountId: claims.sub,
                        gatewayId: id,
                        action,
                    },
                );
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
            if (entry.required && action === "disable") {
                log?.("warn", "Blocked attempt to disable required gateway.", {
                    ...logMeta,
                    accountId: claims.sub,
                    gatewayId: id,
                });
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "required_gateway",
                            message: "Required gateways cannot be disabled",
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
            log?.("info", `Gateway ${action}d.`, {
                ...logMeta,
                accountId: claims.sub,
                gatewayId: id,
                status: action === "enable" ? "active" : "disabled",
            });
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
