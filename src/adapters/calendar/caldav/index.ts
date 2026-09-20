import type {
    CalendarAdapter,
    CalendarAdapterBootstrapCtx,
} from "../../../gateways/calendar/gateway/index.js";
import {
    readSharePassphrase,
    resolveGatewayCalendarShare,
} from "../../../gateways/calendar/reuse/share-auth.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { buildCalendarExportHeaders } from "../../../gateways/calendar/reuse/export-headers.js";
import { parseIcsDate } from "../../../gateways/calendar/gateway/utils.js";

async function readRequestText(
    req: AsyncIterable<Uint8Array>,
): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString("utf8");
}

function escapeXml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function parseEventPayload(ics: string): {
    eventId: string;
    title: string;
    description: string;
    startAt: string;
    endAt: string;
} | null {
    const unfolded = ics.replace(/\r?\n[ \t]/g, "");
    const readValue = (name: string) =>
        unfolded
            .match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, "mi"))?.[1]
            ?.trim() ?? "";
    const startAt = parseIcsDate(readValue("DTSTART"));
    const endAt = parseIcsDate(readValue("DTEND"));
    const title = readValue("SUMMARY");
    if (!title || !startAt || !endAt) return null;
    return {
        eventId: readValue("UID"),
        title,
        description: readValue("DESCRIPTION"),
        startAt,
        endAt,
    };
}

export function createCalendarAdapter(): CalendarAdapter {
    return {
        adapterId: "caldav",
        adapterName: "CalDAV",
    };
}

function createCaldavRoutes(ctx: CalendarAdapterBootstrapCtx) {
    const routeContext = resolveRouteContext(
        ctx.capabilities.get<RouteContext>("auth:routeContext"),
    );
    const resolveCalendarLink = ctx.capabilities.get<
        (token: string) => Promise<{
            calendarId: string;
            passphrase: string | null;
        } | null>
    >("calendar:resolveShareLink");
    const isMetadataProbeMethod = (method: string | undefined) =>
        method === "HEAD" ||
        method === "OPTIONS" ||
        method === "PROPFIND" ||
        method === "REPORT";
    const isMutationMethod = (method: string | undefined) =>
        [
            "PUT",
            "POST",
            "DELETE",
            "MKCOL",
            "MKCALENDAR",
            "MOVE",
            "COPY",
            "PROPPATCH",
            "ACL",
        ].includes(String(method ?? ""));
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
        resourcePath: string,
        accessMode: "read" | "write" = "read",
    ) => {
        const headers = {
            ...buildCalendarExportHeaders(calendarName, calendarId),
            "x-cognis-calendar-access": accessMode,
            "x-cognis-calendar-read-only":
                accessMode === "read" ? "true" : "false",
            dav: "1, calendar-access",
        };
        if (reqMethod === "OPTIONS") {
            res.writeHead(204, {
                ...headers,
                allow:
                    accessMode === "write"
                        ? "GET,HEAD,OPTIONS,PROPFIND,REPORT,PUT,DELETE"
                        : "GET,HEAD,OPTIONS,PROPFIND,REPORT",
            });
            res.end();
            return;
        }
        if (reqMethod === "REPORT") {
            res.writeHead(207, {
                ...headers,
                "content-type": "application/xml; charset=utf-8",
            });
            res.end(
                `<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:response><d:href>${escapeXml(resourcePath)}</d:href><d:propstat><d:prop><d:getetag>"${escapeXml(calendarId)}"</d:getetag><c:calendar-data>${escapeXml(payload)}</c:calendar-data></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`,
            );
            return;
        }
        if (reqMethod === "PROPFIND") {
            const writePrivileges =
                accessMode === "write"
                    ? "<d:privilege><d:write/></d:privilege><d:privilege><d:write-content/></d:privilege>"
                    : "";
            res.writeHead(207, {
                ...headers,
                "content-type": "application/xml; charset=utf-8",
            });
            res.end(
                `<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:response><d:href>${escapeXml(resourcePath)}</d:href><d:propstat><d:prop><d:displayname>${escapeXml(calendarName)}</d:displayname><c:calendar-description>${escapeXml(calendarName)}</c:calendar-description><d:resourcetype><d:collection/><c:calendar/></d:resourcetype><d:getcontenttype>text/calendar; component=vevent</d:getcontenttype><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set><d:current-user-privilege-set><d:privilege><d:read/></d:privilege>${writePrivileges}</d:current-user-privilege-set></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`,
            );
            return;
        }
        if (reqMethod === "HEAD") {
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
            const ics = ctx.gateway.exportCalendarAsIcs(calendar.id, "read");
            respondCalendarPayload(
                req.method,
                res,
                ics,
                calendar.name,
                calendar.id,
                `${url.pathname}${url.search}`,
            );
            return true;
        }

        const shareMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/caldav\/share\/([^/]+)\/([^/]+)(?:\/([^/]+))?\/?$/,
        );
        if (
            shareMatch &&
            (req.method === "GET" ||
                isMutationMethod(req.method) ||
                isMetadataProbeMethod(req.method))
        ) {
            const token = decodeURIComponent(shareMatch[1]);
            const collectionPathName = encodeURIComponent(
                decodeURIComponent(shareMatch[2]),
            );
            const receivedPassphrase = readSharePassphrase(req, url);
            const shareLink = await resolveGatewayCalendarShare(
                ctx.capabilities,
                token,
                receivedPassphrase,
                resolveCalendarLink,
                routeContext.getAuthClaims(req)?.sub,
            );
            if (!shareLink?.calendarId) {
                const unauthorized = shareLink?.unauthorized === true;
                res.writeHead(unauthorized ? 401 : 404, {
                    "content-type": "application/json",
                    ...(unauthorized
                        ? {
                              "www-authenticate":
                                  'Basic realm="Calendar Share"',
                          }
                        : {}),
                });
                res.end(
                    JSON.stringify({
                        error: {
                            code: unauthorized ? "unauthorized" : "not_found",
                            message: unauthorized
                                ? "Valid calendar share token required."
                                : "Calendar export not found.",
                        },
                    }),
                );
                return true;
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
            if (isMutationMethod(req.method)) {
                if (!shareLink.writable) {
                    res.writeHead(403, {
                        "content-type": "application/xml; charset=utf-8",
                        allow: "GET,HEAD,OPTIONS,PROPFIND,REPORT",
                    });
                    res.end(
                        `<?xml version="1.0" encoding="utf-8"?><d:error xmlns:d="DAV:"><d:need-privileges><d:resource><d:href>${escapeXml(`${url.pathname}${url.search}`)}</d:href><d:privilege><d:write/></d:privilege></d:resource></d:need-privileges></d:error>`,
                    );
                    return true;
                }
                if (req.method !== "PUT" && req.method !== "DELETE") {
                    res.writeHead(405, {
                        allow: "GET,HEAD,OPTIONS,PROPFIND,REPORT,PUT,DELETE",
                    });
                    res.end();
                    return true;
                }
                const pathEventId = decodeURIComponent(
                    shareMatch[3] ?? "",
                ).replace(/\.ics$/i, "");
                if (req.method === "DELETE") {
                    ctx.gateway.deleteSharedEvent({
                        calendarId: calendar.id,
                        eventId: pathEventId,
                    });
                    await ctx.gateway.flushStore();
                    ctx.log?.("info", "Shared CalDAV event deleted.", {
                        component: "calendar-caldav",
                        operation: "delete_shared_event",
                        calendarId: calendar.id,
                        eventId: pathEventId,
                    });
                    res.writeHead(204);
                    res.end();
                    return true;
                }
                const eventPayload = parseEventPayload(
                    await readRequestText(req),
                );
                if (!eventPayload) {
                    res.writeHead(400, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "invalid_ics",
                                message: "A valid calendar event is required.",
                            },
                        }),
                    );
                    return true;
                }
                const eventId = pathEventId || eventPayload.eventId;
                const existingEvent = eventId
                    ? ctx.gateway.getEvent(calendar.id, eventId)
                    : null;
                const savedEvent = existingEvent
                    ? ctx.gateway.updateSharedEvent({
                          calendarId: calendar.id,
                          eventId: existingEvent.id,
                          title: eventPayload.title,
                          description: eventPayload.description,
                          startAt: eventPayload.startAt,
                          endAt: eventPayload.endAt,
                      })
                    : ctx.gateway.addEventToCalendar({
                          calendarId: calendar.id,
                          title: eventPayload.title,
                          description: eventPayload.description,
                          startAt: eventPayload.startAt,
                          endAt: eventPayload.endAt,
                          createdBy: calendar.ownerAccountId,
                          attendees: [],
                          inviteEmails: [],
                          reminderOffsetsMinutes: [],
                          meetingUrl: null,
                          status: "busy",
                          recurrence: "none",
                      });
                await ctx.gateway.flushStore();
                ctx.log?.("info", "Shared CalDAV event saved.", {
                    component: "calendar-caldav",
                    operation: existingEvent
                        ? "update_shared_event"
                        : "create_shared_event",
                    calendarId: calendar.id,
                    eventId: savedEvent.id,
                });
                res.writeHead(existingEvent ? 204 : 201, {
                    location: `/api/v1/calendar/caldav/share/${encodeURIComponent(token)}/${collectionPathName ? `${collectionPathName}/` : ""}${encodeURIComponent(savedEvent.id)}.ics`,
                });
                res.end();
                return true;
            }
            const ics = ctx.gateway.exportCalendarAsIcs(
                calendar.id,
                shareLink.writable ? "write" : "read",
            );
            respondCalendarPayload(
                req.method,
                res,
                ics,
                calendar.name,
                calendar.id,
                `${url.pathname}${url.search}`,
                shareLink.writable ? "write" : "read",
            );
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
            respondCalendarPayload(
                req.method,
                res,
                ics,
                calendar.name,
                calendar.id,
                `${url.pathname}${url.search}`,
            );
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
