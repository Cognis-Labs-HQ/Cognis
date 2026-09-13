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

const REQUEST_ERROR_CODES = new Set([
    "correction_route_required",
    "correction_scope_mismatch",
    "correction_target_invalid",
    "invalid_activity",
    "invalid_attempt",
    "invalid_classroom_id",
    "invalid_completion",
    "invalid_content_id",
    "invalid_content_revision",
    "invalid_correctness",
    "invalid_duration",
    "invalid_event_id",
    "invalid_from",
    "invalid_hints",
    "invalid_independent_correctness",
    "invalid_interest_vein",
    "invalid_language",
    "invalid_layer",
    "invalid_metadata",
    "invalid_occurred_at",
    "invalid_schema",
    "invalid_time_window",
    "invalid_until",
    "unsafe_metadata",
]);

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
                  : code === "event_id_conflict" ||
                      code === "event_already_corrected"
                    ? 409
                    : REQUEST_ERROR_CODES.has(code)
                      ? 400
                      : 500;
            sendJson(response, status, {
                error: { code: status === 500 ? "internal_error" : code },
            });
            return true;
        }
    };
}
