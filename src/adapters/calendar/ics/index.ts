import type {
    CalendarAdapter,
    CalendarAdapterBootstrapCtx,
} from "../../../gateways/calendar/gateway/index.js";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    passphrasesMatch,
    readSharePassphrase,
} from "../../../gateways/calendar/reuse/share-auth.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { buildCalendarExportHeaders } from "../../../gateways/calendar/reuse/export-headers.js";

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
        calendarId: string,
    ) => {
        const headers = buildCalendarExportHeaders(calendarName, calendarId);
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
        const publicMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/ics\/public\/([^/]+)$/,
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
            respondCalendarPayload(
                req.method,
                res,
                ics,
                calendar.name,
                calendar.id,
            );
            return true;
        }

        const shareMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/ics\/share\/([^/]+)$/,
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
            respondCalendarPayload(
                req.method,
                res,
                ics,
                calendar.name,
                calendar.id,
            );
            return true;
        }

        const privateMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/ics\/private\/([^/]+)$/,
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
            const ics = ctx.gateway.exportCalendarAsIcs(calendar.id);
            respondCalendarPayload(
                req.method,
                res,
                ics,
                calendar.name,
                calendar.id,
            );
            return true;
        }

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
            res.writeHead(
                200,
                buildCalendarExportHeaders(calendar.name, calendar.id),
            );
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
