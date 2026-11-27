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
    request: AsyncIterable<Uint8Array>,
): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
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
        requestMethod: string | undefined,
        response: {
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
        if (requestMethod === "OPTIONS") {
            response.writeHead(204, {
                ...headers,
                allow:
                    accessMode === "write"
                        ? "GET,HEAD,OPTIONS,PROPFIND,REPORT,PUT,DELETE"
                        : "GET,HEAD,OPTIONS,PROPFIND,REPORT",
            });
            response.end();
            return;
        }
        if (requestMethod === "REPORT") {
            response.writeHead(207, {
                ...headers,
                "content-type": "application/xml; charset=utf-8",
            });
            response.end(
                `<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:response><d:href>${escapeXml(resourcePath)}</d:href><d:propstat><d:prop><d:getetag>"${escapeXml(calendarId)}"</d:getetag><c:calendar-data>${escapeXml(payload)}</c:calendar-data></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`,
            );
            return;
        }
        if (requestMethod === "PROPFIND") {
            const writePrivileges =
                accessMode === "write"
                    ? "<d:privilege><d:write/></d:privilege><d:privilege><d:write-content/></d:privilege>"
                    : "";
            response.writeHead(207, {
                ...headers,
                "content-type": "application/xml; charset=utf-8",
            });
            response.end(
                `<?xml version="1.0" encoding="utf-8"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:response><d:href>${escapeXml(resourcePath)}</d:href><d:propstat><d:prop><d:displayname>${escapeXml(calendarName)}</d:displayname><c:calendar-description>${escapeXml(calendarName)}</c:calendar-description><d:resourcetype><d:collection/><c:calendar/></d:resourcetype><d:getcontenttype>text/calendar; component=vevent</d:getcontenttype><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set><d:current-user-privilege-set><d:privilege><d:read/></d:privilege>${writePrivileges}</d:current-user-privilege-set></d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response></d:multistatus>`,
            );
            return;
        }
        if (requestMethod === "HEAD") {
            response.writeHead(200, headers);
            response.end();
            return;
        }
        response.writeHead(200, headers);
        response.end(payload);
    };

    return async (request, response, url): Promise<boolean> => {
        const exportMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/caldav\/calendars\/([^/]+)\/export$/,
        );
        if (exportMatch && request.method === "GET") {
            const claims = routeContext.requireAuth(request, response, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(exportMatch[1]);
            const calendar = ctx.gateway.getOwnedCalendar(
                claims.sub,
                calendarId,
            );
            if (!calendar) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                response.writeHead(200, { "content-type": "application/json" });
                response.end(
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
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
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
            (request.method === "GET" || isMetadataProbeMethod(request.method))
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
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                request.method,
                response,
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
            (request.method === "GET" ||
                isMutationMethod(request.method) ||
                isMetadataProbeMethod(request.method))
        ) {
            const token = decodeURIComponent(shareMatch[1]);
            const collectionPathName = encodeURIComponent(
                decodeURIComponent(shareMatch[2]),
            );
            const receivedPassphrase = readSharePassphrase(request, url);
            const shareLink = await resolveGatewayCalendarShare(
                ctx.capabilities,
                token,
                receivedPassphrase,
                resolveCalendarLink,
                routeContext.getAuthClaims(request)?.sub,
            );
            if (!shareLink?.calendarId) {
                const unauthorized = shareLink?.unauthorized === true;
                response.writeHead(unauthorized ? 401 : 404, {
                    "content-type": "application/json",
                    ...(unauthorized
                        ? {
                              "www-authenticate":
                                  'Basic realm="Calendar Share"',
                          }
                        : {}),
                });
                response.end(
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
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Calendar export not found.",
                        },
                    }),
                );
                return true;
            }
            if (isMutationMethod(request.method)) {
                if (!shareLink.writable) {
                    response.writeHead(403, {
                        "content-type": "application/xml; charset=utf-8",
                        allow: "GET,HEAD,OPTIONS,PROPFIND,REPORT",
                    });
                    response.end(
                        `<?xml version="1.0" encoding="utf-8"?><d:error xmlns:d="DAV:"><d:need-privileges><d:resource><d:href>${escapeXml(`${url.pathname}${url.search}`)}</d:href><d:privilege><d:write/></d:privilege></d:resource></d:need-privileges></d:error>`,
                    );
                    return true;
                }
                if (request.method !== "PUT" && request.method !== "DELETE") {
                    response.writeHead(405, {
                        allow: "GET,HEAD,OPTIONS,PROPFIND,REPORT,PUT,DELETE",
                    });
                    response.end();
                    return true;
                }
                const pathEventId = decodeURIComponent(
                    shareMatch[3] ?? "",
                ).replace(/\.ics$/i, "");
                if (request.method === "DELETE") {
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
                    response.writeHead(204);
                    response.end();
                    return true;
                }
                const eventPayload = parseEventPayload(
                    await readRequestText(request),
                );
                if (!eventPayload) {
                    response.writeHead(400, {
                        "content-type": "application/json",
                    });
                    response.end(
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
                response.writeHead(existingEvent ? 204 : 201, {
                    location: `/api/v1/calendar/caldav/share/${encodeURIComponent(token)}/${collectionPathName ? `${collectionPathName}/` : ""}${encodeURIComponent(savedEvent.id)}.ics`,
                });
                response.end();
                return true;
            }
            const ics = ctx.gateway.exportCalendarAsIcs(
                calendar.id,
                shareLink.writable ? "write" : "read",
            );
            respondCalendarPayload(
                request.method,
                response,
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
            (request.method === "GET" || isMetadataProbeMethod(request.method))
        ) {
            const claims = routeContext.requireAuth(request, response, "user");
            if (!claims) return true;
            const token = decodeURIComponent(privateMatch[1]);
            const tokenRecord = ctx.gateway.resolvePrivateExportToken(token);
            if (!tokenRecord) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
                request.method,
                response,
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
