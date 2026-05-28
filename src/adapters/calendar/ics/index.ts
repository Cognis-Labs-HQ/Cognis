import type {
    CalendarAdapter,
    CalendarAdapterBootstrapCtx,
} from "../../../gateways/calendar/gateway.js";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";

export function createCalendarAdapter(): CalendarAdapter {
    return {
        adapterId: "ics",
        adapterName: "ICS",
    };
}

function createIcsRoutes(ctx: CalendarAdapterBootstrapCtx) {
    const routeContext = resolveRouteContext(
        ctx.capabilities.get<RouteContext>("auth:routeContext"),
    );

    return async (req, res, url): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/calendar/ics/export" &&
            req.method === "GET"
        ) {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = String(
                url.searchParams.get("calendarId") ?? "",
            ).trim();
            const calendar = ctx.gateway.getOwnedCalendar(
                claims.sub,
                calendarId,
            );
            if (!calendar) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Calendar not found.",
                        },
                    }),
                );
                return true;
            }
            const ics = ctx.gateway.exportCalendarAsIcs(calendar.id);
            res.writeHead(200, {
                "content-type": "text/calendar; charset=utf-8",
            });
            res.end(ics);
            return true;
        }

        if (
            url.pathname === "/api/v1/calendar/ics/import" &&
            req.method === "POST"
        ) {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const body = (await readJson(req)) as {
                calendarId?: unknown;
                ics?: unknown;
            };
            const calendarId = String(body?.calendarId ?? "").trim();
            const ics = String(body?.ics ?? "").trim();
            if (!calendarId || !ics) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "calendarId and ics are required.",
                        },
                    }),
                );
                return true;
            }
            try {
                const result = ctx.gateway.importIcs({
                    ownerAccountId: claims.sub,
                    calendarId,
                    ics,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: result }));
                return true;
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message === "calendar_not_found"
                ) {
                    res.writeHead(404, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "not_found",
                                message: "Calendar not found.",
                            },
                        }),
                    );
                    return true;
                }
                res.writeHead(500, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "internal_error",
                            message: "Failed to import ICS.",
                        },
                    }),
                );
                return true;
            }
        }

        return false;
    };
}

export async function bootstrapCalendarAdapter(
    ctx: CalendarAdapterBootstrapCtx,
): Promise<void> {
    ctx.registerRoute(createIcsRoutes(ctx), "calendar");
}
