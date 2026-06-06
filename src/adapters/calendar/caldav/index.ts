import type {
    CalendarAdapter,
    CalendarAdapterBootstrapCtx,
} from "../../../gateways/calendar/gateway/index.js";
import {
    passphrasesMatch,
    readSharePassphrase,
} from "../../../gateways/calendar/reuse/share-auth.js";
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
    const resolveShareLink = ctx.capabilities.get<
        (token: string) => Promise<{
            calendarId: string;
            passphrase: string | null;
        } | null>
    >("calendar:resolveShareLink");
    const isMetadataProbeMethod = (method: string | undefined) =>
        method === "HEAD" || method === "OPTIONS" || method === "PROPFIND";
    const respondCalendarPayload = (
        reqMethod: string | undefined,
        res: {
            writeHead: (
                statusCode: number,
                headers?: Record<string, string>,
            ) => void;
            end: (chunk?: string) => void;
        },
        payload: string,
        calendarName: string,
    ) => {
        const headers = buildCalendarExportHeaders(calendarName);
        if (reqMethod === "OPTIONS") {
            res.writeHead(204, {
                ...headers,
                allow: "GET,HEAD,OPTIONS,PROPFIND",
            });
            res.end();
            return;
        }
        if (reqMethod === "HEAD" || reqMethod === "PROPFIND") {
            res.writeHead(200, headers);
            res.end();
            return;
        }
        res.writeHead(200, headers);
        res.end(payload);
    };

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
                            url: `/api/v1/calendar/caldav/public/${encodeURIComponent(calendar.name)}?calendarId=${encodeURIComponent(calendar.id)}`,
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
        if (
            publicMatch &&
            (req.method === "GET" || isMetadataProbeMethod(req.method))
        ) {
            const encodedName = decodeURIComponent(publicMatch[1]);
            const calendarIdFromQuery = String(
                url.searchParams.get("calendarId") ?? "",
            ).trim();
            const calendar =
                (calendarIdFromQuery
                    ? ctx.gateway.getCalendar(calendarIdFromQuery)
                    : null) ?? ctx.gateway.getCalendar(encodedName);
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
            const ics = ctx.gateway.exportCalendarAsIcs(calendar.id);
            respondCalendarPayload(req.method, res, ics, calendar.name);
            return true;
        }

        const shareMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/caldav\/share\/([^/]+)$/,
        );
        if (
            shareMatch &&
            (req.method === "GET" || isMetadataProbeMethod(req.method))
        ) {
            const token = decodeURIComponent(shareMatch[1]);
            const shareLink = resolveShareLink
                ? await resolveShareLink(token)
                : null;
            if (!shareLink) {
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
            if (shareLink.passphrase) {
                const receivedPassphrase = readSharePassphrase(req, url);
                if (
                    !receivedPassphrase ||
                    !passphrasesMatch(shareLink.passphrase, receivedPassphrase)
                ) {
                    res.writeHead(401, {
                        "content-type": "application/json",
                        "www-authenticate": 'Basic realm="Calendar Share"',
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "unauthorized",
                                message:
                                    "Valid calendar share passphrase required.",
                            },
                        }),
                    );
                    return true;
                }
            }
            const calendar = ctx.gateway.getCalendar(shareLink.calendarId);
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
            const ics = ctx.gateway.exportCalendarAsIcs(calendar.id);
            respondCalendarPayload(req.method, res, ics, calendar.name);
            return true;
        }

        const privateMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/caldav\/private\/([^/]+)$/,
        );
        if (
            privateMatch &&
            (req.method === "GET" || isMetadataProbeMethod(req.method))
        ) {
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
            respondCalendarPayload(req.method, res, ics, calendar.name);
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
