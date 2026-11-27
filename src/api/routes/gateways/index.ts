import {
    isRoleAllowed,
    type BootstrapLog,
    type GatewayRegistry,
} from "@cognis/core";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { UIRegistry } from "../../reuse/ui-registry.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../reuse/route-context.js";

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
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    function isSectionEnabled(section: { isEnabled?: () => boolean }): boolean {
        return section.isEnabled?.() ?? true;
    }
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMetadata = {
            component: "api-gateways",
            method: request.method ?? "GET",
            path: url.pathname,
        };
        if (url.pathname === "/api/v1/gateways" && request.method === "GET") {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            log?.("debug", "Listed gateways.", {
                ...logMetadata,
                accountId: claims.sub,
                count: registry.list().length,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: registry.list() }));
            return true;
        }

        if (
            url.pathname === "/api/v1/admin/sections" &&
            request.method === "GET"
        ) {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const sections = (uiRegistry?.listAdminSections() ?? []).filter(
                (section) =>
                    isSectionEnabled(section) &&
                    isRoleAllowed(claims.role, section.access),
            );
            log?.("debug", "Listed admin sections.", {
                ...logMetadata,
                accountId: claims.sub,
                count: sections.length,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: sections }));
            return true;
        }

        const singleMatch = url.pathname.match(
            /^\/api\/v1\/gateways\/([^/]+)$/,
        );
        if (singleMatch && request.method === "GET") {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const id = decodeURIComponent(singleMatch[1]);
            const manifest = registry.get(id);
            if (!manifest) {
                log?.("warn", "Gateway lookup failed.", {
                    ...logMetadata,
                    accountId: claims.sub,
                    gatewayId: id,
                });
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                ...logMetadata,
                accountId: claims.sub,
                gatewayId: id,
                status: manifest.status,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: manifest }));
            return true;
        }

        const actionMatch = url.pathname.match(
            /^\/api\/v1\/gateways\/([^/]+)\/(enable|disable)$/,
        );
        if (actionMatch && request.method === "POST") {
            const claims = ctx.requireAuth(request, response, "admin");
            if (!claims) return true;
            const id = decodeURIComponent(actionMatch[1]);
            const action = actionMatch[2] as "enable" | "disable";
            const entry = registry.get(id);
            if (!entry) {
                log?.(
                    "warn",
                    "Gateway toggle failed because gateway was not found.",
                    {
                        ...logMetadata,
                        accountId: claims.sub,
                        gatewayId: id,
                        action,
                    },
                );
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                    ...logMetadata,
                    accountId: claims.sub,
                    gatewayId: id,
                });
                response.writeHead(403, { "content-type": "application/json" });
                response.end(
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
                await registry.enable(id);
            } else {
                await registry.disable(id);
            }
            await persistGatewayState?.(id, action === "enable");
            log?.("info", `Gateway ${action}d.`, {
                ...logMetadata,
                accountId: claims.sub,
                gatewayId: id,
                status: action === "enable" ? "active" : "disabled",
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
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
