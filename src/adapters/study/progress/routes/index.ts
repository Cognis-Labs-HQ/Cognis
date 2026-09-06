import type { IncomingMessage, ServerResponse } from "node:http";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type { ProgressCapability } from "../service.js";
import { createAggregateRoutes } from "./aggregate/index.js";
import { createEventRoutes } from "./events/index.js";
import { createProjectionRoutes } from "./projections/index.js";
import { createRebuildRoutes } from "./rebuild/index.js";
import { sendJson } from "./http.js";

export function createProgressRoutes(
    progress: ProgressCapability,
    providedContext?: RouteContext,
    log?: (
        level: string,
        message: string,
        metadata?: Record<string, unknown>,
    ) => void | Promise<void>,
) {
    const routeContext = resolveRouteContext(providedContext);
    const routes = [
        createEventRoutes(progress, routeContext),
        createProjectionRoutes(progress, routeContext),
        createAggregateRoutes(progress, routeContext),
        createRebuildRoutes(progress, routeContext),
    ];
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith("/api/v1/study/progress")) return false;
        try {
            for (const route of routes) {
                if (await route(request, response, url)) return true;
            }
            return false;
        } catch (error) {
            const code =
                error instanceof Error ? error.message : "internal_error";
            await log?.("error", "Study progress request failed.", {
                component: "study-progress",
                operation: "route",
                method: request.method,
                path: url.pathname,
                error: code,
            });
            const status = code.startsWith("forbidden")
                ? 403
                : code === "event_not_found"
                  ? 404
                  : 400;
            sendJson(response, status, { error: { code } });
            return true;
        }
    };
}
