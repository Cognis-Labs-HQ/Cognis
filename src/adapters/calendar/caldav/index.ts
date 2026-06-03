import type {
    CalendarAdapter,
    CalendarAdapterBootstrapCtx,
} from "../../../gateways/calendar/gateway/index.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";

export function createCalendarAdapter(): CalendarAdapter {
    return {
        adapterId: "caldav",
        adapterName: "CalDAV",
    };
}

const buildCalendarExportHeaders = (calendarName: string) => ({
    "content-type": "text/calendar; charset=utf-8",
    "x-cognis-calendar-name": sanitizeHeaderValue(calendarName),
});

function sanitizeHeaderValue(value: string): string {
    return String(value ?? "")
        .replace(/[\r\n]+/g, " ")
        .trim();
}

function createCaldavRoutes(ctx: CalendarAdapterBootstrapCtx) {
    const routeContext = resolveRouteContext(
        ctx.capabilities.get<RouteContext>("auth:routeContext"),
    );

    return async (req, res, url): Promise<boolean> => {
        const exportMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/caldav\/calendars\/([^/]+)\/export$/,
        );
        if (exportMatch && req.method === "GET") {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(exportMatch[1]);
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
            if (calendar.visibility === "public") {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: {
                            access: "public",
                            url: `/api/v1/calendar/caldav/public/${encodeURIComponent(calendar.id)}`,
                        },
                    }),
                );
                return true;
            }
            const tokenRecord = ctx.gateway.issuePrivateExportToken({
                ownerAccountId: claims.sub,
                calendarId: calendar.id,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        access: "private",
                        url: `/api/v1/calendar/caldav/private/${encodeURIComponent(tokenRecord.token)}`,
                        expiresAt: tokenRecord.expiresAt,
                    },
                }),
            );
            return true;
        }

        const publicMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/caldav\/public\/([^/]+)$/,
        );
        if (publicMatch && req.method === "GET") {
            const calendarId = decodeURIComponent(publicMatch[1]);
            const calendar = ctx.gateway.getCalendar(calendarId);
            if (!calendar || calendar.visibility !== "public") {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Calendar export not found.",
                        },
                    }),
                );
                return true;
            }
            const ics = ctx.gateway.exportCalendarAsIcs(calendarId);
            res.writeHead(200, buildCalendarExportHeaders(calendar.name));
            res.end(ics);
            return true;
        }

        const privateMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/caldav\/private\/([^/]+)$/,
        );
        if (privateMatch && req.method === "GET") {
            const claims = routeContext.requireAuth(req, res, "user");
            if (!claims) return true;
            const token = decodeURIComponent(privateMatch[1]);
            const tokenRecord = ctx.gateway.resolvePrivateExportToken(token);
            if (!tokenRecord) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Calendar export token not found.",
                        },
                    }),
                );
                return true;
            }
            const calendar = ctx.gateway.getCalendar(tokenRecord.calendarId);
            if (!calendar) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Calendar export not found.",
                        },
                    }),
                );
                return true;
            }
            const ics = ctx.gateway.exportCalendarAsIcs(tokenRecord.calendarId);
            res.writeHead(200, buildCalendarExportHeaders(calendar.name));
            res.end(ics);
            return true;
        }

        return false;
    };
}

export async function bootstrapCalendarAdapter(
    ctx: CalendarAdapterBootstrapCtx,
): Promise<void> {
    ctx.registerRoute(createCaldavRoutes(ctx), "calendar");
}
