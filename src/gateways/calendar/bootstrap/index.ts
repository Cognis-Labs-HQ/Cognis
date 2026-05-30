import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasMinRole } from "@cognis/core";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { createGatewayUiRegistryHooks } from "../../reuse/ui-registry-hooks.js";
import {
    dispatchCancellationNotifications,
    dispatchInviteNotifications,
    normalizeAttendeesForOwner,
    normalizeResponseValue,
    normalizeStringList,
    normalizeVisibility,
    requireOrganizerOwnedSourceEvent,
    resolveCreatedSeries,
    resolveEventMeta,
    sendCalendarError,
    sendJson,
    syncInvitedCopiesForEvents,
    type CalendarLogger,
    type NotificationDispatcher,
    type ResolveAccountId,
} from "./helpers.js";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { GatewayBootstrapContext } from "../shared.js";
import { DbCalendarStore } from "../calendar-store.js";
import { normalizeCalendarColor } from "../color.js";
import {
    CoreCalendarGateway,
    type CalendarEventRecord,
    type CalendarEventResponse,
    type CalendarVisibility,
} from "../gateway.js";

import { createCalendarAdapterRoutes } from "./adapter-routes.js";

const GATEWAY_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);

function createCalendarCoreRoutes({
    gateway,
    dispatchNotification,
    routeContext,
    resolveAccountId,
    log,
}: {
    gateway: CoreCalendarGateway;
    dispatchNotification: NotificationDispatcher | null;
    routeContext?: RouteContext;
    resolveAccountId: ResolveAccountId | null;
    log?: CalendarLogger;
}) {
    const ctx = resolveRouteContext(routeContext);
    const externalHost =
        process.env.EXTERNAL_HOST ??
        (process.env.HOST ? `http://${process.env.HOST}` : "");
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/calendar/calendars" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            gateway.ensureDefaultCalendar(claims.sub);
            sendJson(res, 200, {
                data: gateway.listCalendars(claims.sub),
                meta: {
                    canInviteExternal: hasMinRole(claims.role, "admin"),
                },
            });
            return true;
        }

        if (
            url.pathname === "/api/v1/calendar/calendars" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const body = (await readJson(req)) as {
                name?: unknown;
                visibility?: unknown;
                color?: unknown;
            };
            const name = String(body?.name ?? "").trim();
            if (!name) {
                sendCalendarError(
                    res,
                    "bad_request",
                    "Calendar name is required.",
                    400,
                );
                return true;
            }
            try {
                const created = gateway.createCalendar({
                    ownerAccountId: claims.sub,
                    name,
                    visibility: normalizeVisibility(body?.visibility),
                    color: normalizeCalendarColor(body?.color),
                });
                await gateway.flushStore();
                sendJson(res, 201, { data: created });
            } catch (error) {
                log?.("error", "Failed to create calendar.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to create calendar.",
                    500,
                );
            }
            return true;
        }

        const patchCalendarMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)$/,
        );
        if (patchCalendarMatch && req.method === "PATCH") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(patchCalendarMatch[1]);
            const body = await readJson(req);
            try {
                const updated = gateway.updateCalendar({
                    ownerAccountId: claims.sub,
                    calendarId,
                    name:
                        body?.name !== undefined
                            ? String(body.name)
                            : undefined,
                    visibility:
                        body?.visibility !== undefined
                            ? normalizeVisibility(body.visibility)
                            : undefined,
                    color:
                        body?.color !== undefined
                            ? normalizeCalendarColor(body.color)
                            : undefined,
                });
                await gateway.flushStore();
                sendJson(res, 200, { data: updated });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "calendar_error";
                if (message === "calendar_not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Calendar not found.",
                        404,
                    );
                    return true;
                }
                if (message === "calendar_default_name_locked") {
                    sendCalendarError(
                        res,
                        "conflict",
                        "Default calendar name cannot be changed.",
                        409,
                    );
                    return true;
                }
                if (message === "calendar_name_required") {
                    sendCalendarError(
                        res,
                        "validation_error",
                        "Calendar name is required.",
                        400,
                    );
                    return true;
                }
                log?.("error", "Failed to update calendar.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    calendarId,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to update calendar.",
                    500,
                );
            }
            return true;
        }

        const deleteCalendarMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)$/,
        );
        if (deleteCalendarMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(deleteCalendarMatch[1]);
            try {
                gateway.deleteCalendar({
                    ownerAccountId: claims.sub,
                    calendarId,
                });
                await gateway.flushStore();
                sendJson(res, 200, { data: { deleted: true } });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "calendar_error";
                if (message === "calendar_not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Calendar not found.",
                        404,
                    );
                    return true;
                }
                if (message === "calendar_default_locked") {
                    sendCalendarError(
                        res,
                        "conflict",
                        "Default calendar cannot be deleted.",
                        409,
                    );
                    return true;
                }
                log?.("error", "Failed to delete calendar.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    calendarId,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to delete calendar.",
                    500,
                );
            }
            return true;
        }

        const shareCalendarMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)\/share$/,
        );
        if (shareCalendarMatch && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(shareCalendarMatch[1]);
            const calendar = gateway.getOwnedCalendar(claims.sub, calendarId);
            if (!calendar) {
                sendCalendarError(res, "not_found", "Calendar not found.", 404);
                return true;
            }
            const body = (await readJson(req)) as {
                permission?: unknown;
                expiresInHours?: unknown;
            };
            const permission =
                body.permission === "write" ? "write" : "read";
            const sharePath =
                calendar.visibility === "public"
                    ? `/api/v1/calendar/caldav/public/${encodeURIComponent(calendar.id)}`
                    : `/api/v1/calendar/caldav/private/${encodeURIComponent(
                          gateway.issuePrivateExportToken({
                              ownerAccountId: claims.sub,
                              calendarId: calendar.id,
                              ttlSeconds:
                                  body.expiresInHours === null
                                      ? null
                                      : typeof body.expiresInHours ===
                                              "number" &&
                                          Number.isFinite(body.expiresInHours) &&
                                          body.expiresInHours > 0
                                        ? Math.round(
                                              body.expiresInHours * 3600,
                                          )
                                        : 24 * 3600,
                          }).token,
                      )}`;
            sendJson(res, 200, {
                data: {
                    permission,
                    shareUrl: externalHost
                        ? `${externalHost}${sharePath}`
                        : sharePath,
                },
            });
            return true;
        }

        const eventsMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)\/events$/,
        );
        if (eventsMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventsMatch[1]);
            const calendar = gateway.getOwnedCalendar(claims.sub, calendarId);
            if (!calendar) {
                sendCalendarError(res, "not_found", "Calendar not found.", 404);
                return true;
            }
            sendJson(res, 200, {
                data: {
                    calendar,
                    events: gateway.listEvents(calendarId),
                },
            });
            return true;
        }

        if (eventsMatch && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventsMatch[1]);
            const body = (await readJson(req)) as {
                title?: unknown;
                description?: unknown;
                startAt?: unknown;
                endAt?: unknown;
                attendees?: unknown;
                inviteEmails?: unknown;
                meetingUrl?: unknown;
                status?: unknown;
                recurrence?: unknown;
            };
            const title = String(body?.title ?? "").trim();
            const startAt = String(body?.startAt ?? "").trim();
            const endAt = String(body?.endAt ?? "").trim();
            const inviteEmails = normalizeStringList(body.inviteEmails);
            const canInviteByEmail = hasMinRole(claims.role, "admin");
            if (!title || !startAt || !endAt) {
                sendCalendarError(
                    res,
                    "bad_request",
                    "title, startAt, and endAt are required.",
                    400,
                );
                return true;
            }
            if (inviteEmails.length > 0 && !canInviteByEmail) {
                sendCalendarError(
                    res,
                    "forbidden",
                    "Only founder or admin users can send email invites.",
                    403,
                );
                return true;
            }
            try {
                const attendees = await normalizeAttendeesForOwner(
                    body.attendees,
                    claims.sub,
                    resolveAccountId,
                );
                const createdEvent = gateway.addEvent({
                    ownerAccountId: claims.sub,
                    calendarId,
                    title,
                    description:
                        typeof body.description === "string"
                            ? body.description
                            : null,
                    startAt,
                    endAt,
                    attendees,
                    inviteEmails,
                    meetingUrl:
                        typeof body.meetingUrl === "string"
                            ? body.meetingUrl
                            : null,
                    status: body.status === "free" ? "free" : "busy",
                    recurrence:
                        body.recurrence === "daily" ||
                        body.recurrence === "weekly" ||
                        body.recurrence === "monthly" ||
                        body.recurrence === "yearly"
                            ? body.recurrence
                            : "none",
                });
                const createdSeries = resolveCreatedSeries(
                    gateway,
                    calendarId,
                    createdEvent,
                );
                await syncInvitedCopiesForEvents({
                    gateway,
                    events: createdSeries,
                    resolveAccountId,
                });
                await gateway.flushStore();
                await Promise.all(
                    createdSeries.map((event) =>
                        dispatchInviteNotifications({
                            gateway,
                            event,
                            dispatchNotification,
                            canInviteByEmail,
                            externalHost,
                            inviterAccountId: claims.sub,
                            calendarId,
                            resolveAccountId,
                            log,
                        }),
                    ),
                );
                sendJson(res, 201, { data: createdEvent });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "calendar_error";
                if (message === "calendar_not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Calendar not found.",
                        404,
                    );
                    return true;
                }
                if (message === "calendar_invalid_range") {
                    sendCalendarError(
                        res,
                        "bad_request",
                        "Event end time must be after start time.",
                        400,
                    );
                    return true;
                }
                if (message === "calendar_event_title_required") {
                    sendCalendarError(
                        res,
                        "bad_request",
                        "Event title is required.",
                        400,
                    );
                    return true;
                }
                log?.("error", "Failed to create event.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    calendarId,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to create event.",
                    500,
                );
            }
            return true;
        }

        const eventMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)\/events\/([^/]+)$/,
        );
        if (eventMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventMatch[1]);
            const eventId = decodeURIComponent(eventMatch[2]);
            const calendar = gateway.getOwnedCalendar(claims.sub, calendarId);
            const event = calendar
                ? gateway.getEvent(calendarId, eventId)
                : null;
            if (!calendar || !event) {
                sendCalendarError(res, "not_found", "Event not found.", 404);
                return true;
            }
            sendJson(res, 200, {
                data: {
                    calendar,
                    event,
                    meta: resolveEventMeta(
                        event,
                        claims.sub,
                        gateway.getEventResponse(event.id, claims.sub),
                    ),
                },
            });
            return true;
        }

        if (eventMatch && req.method === "PATCH") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventMatch[1]);
            const eventId = decodeURIComponent(eventMatch[2]);
            const body = (await readJson(req)) as {
                title?: unknown;
                description?: unknown;
                startAt?: unknown;
                endAt?: unknown;
                attendees?: unknown;
                inviteEmails?: unknown;
                meetingUrl?: unknown;
                status?: unknown;
                recurrence?: unknown;
                calendarId?: unknown;
                updateAll?: unknown;
            };
            const inviteEmails = normalizeStringList(body.inviteEmails);
            const canInviteByEmail = hasMinRole(claims.role, "admin");
            if (inviteEmails.length > 0 && !canInviteByEmail) {
                sendCalendarError(
                    res,
                    "forbidden",
                    "Only founder or admin users can send email invites.",
                    403,
                );
                return true;
            }
            if (
                !requireOrganizerOwnedSourceEvent({
                    gateway,
                    ownerAccountId: claims.sub,
                    calendarId,
                    eventId,
                    res,
                    actionVerb: "edit",
                })
            ) {
                return true;
            }
            try {
                const attendees = Array.isArray(body.attendees)
                    ? await normalizeAttendeesForOwner(
                          body.attendees,
                          claims.sub,
                          resolveAccountId,
                      )
                    : undefined;
                const updatedEvent = gateway.updateEvent({
                    ownerAccountId: claims.sub,
                    calendarId,
                    eventId,
                    title:
                        typeof body.title === "string" ? body.title : undefined,
                    description:
                        typeof body.description === "string" ||
                        body.description === null
                            ? body.description
                            : undefined,
                    startAt:
                        typeof body.startAt === "string"
                            ? body.startAt
                            : undefined,
                    endAt:
                        typeof body.endAt === "string" ? body.endAt : undefined,
                    attendees,
                    inviteEmails: Array.isArray(body.inviteEmails)
                        ? inviteEmails
                        : undefined,
                    meetingUrl:
                        typeof body.meetingUrl === "string" ||
                        body.meetingUrl === null
                            ? body.meetingUrl
                            : undefined,
                    status:
                        body.status === "free" || body.status === "busy"
                            ? body.status
                            : undefined,
                    recurrence:
                        body.recurrence === "daily" ||
                        body.recurrence === "weekly" ||
                        body.recurrence === "monthly" ||
                        body.recurrence === "yearly" ||
                        body.recurrence === "none"
                            ? body.recurrence
                            : undefined,
                    targetCalendarId:
                        typeof body.calendarId === "string"
                            ? body.calendarId
                            : undefined,
                    updateAll: body.updateAll === true,
                });
                const updatedCalendarId =
                    typeof body.calendarId === "string" &&
                    body.calendarId.trim().length > 0
                        ? body.calendarId.trim()
                        : calendarId;
                const updatedSeries = resolveCreatedSeries(
                    gateway,
                    updatedCalendarId,
                    updatedEvent,
                );
                await syncInvitedCopiesForEvents({
                    gateway,
                    events: updatedSeries,
                    resolveAccountId,
                });
                await gateway.flushStore();
                sendJson(res, 200, { data: updatedEvent });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "calendar_error";
                if (message === "calendar_not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Calendar not found.",
                        404,
                    );
                    return true;
                }
                if (message === "calendar_event_not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Event not found.",
                        404,
                    );
                    return true;
                }
                if (message === "calendar_invalid_range") {
                    sendCalendarError(
                        res,
                        "bad_request",
                        "Event end time must be after start time.",
                        400,
                    );
                    return true;
                }
                log?.("error", "Failed to update event.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    calendarId,
                    eventId,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to update event.",
                    500,
                );
            }
            return true;
        }

        if (eventMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventMatch[1]);
            const eventId = decodeURIComponent(eventMatch[2]);
            try {
                if (
                    !requireOrganizerOwnedSourceEvent({
                        gateway,
                        ownerAccountId: claims.sub,
                        calendarId,
                        eventId,
                        res,
                        actionVerb: "delete",
                    })
                ) {
                    return true;
                }
                const deletedEvents = gateway.deleteEvent({
                    ownerAccountId: claims.sub,
                    calendarId,
                    eventId,
                    deleteAll: url.searchParams.get("series") === "1",
                });
                await gateway.flushStore();
                await Promise.all(
                    deletedEvents.map((deletedEvent) =>
                        dispatchCancellationNotifications({
                            dispatchNotification,
                            event: deletedEvent,
                            resolveAccountId,
                            canInviteByEmail: hasMinRole(claims.role, "admin"),
                            log,
                        }),
                    ),
                );
                sendJson(res, 200, { data: { deleted: true } });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "calendar_error";
                if (message === "calendar_event_not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Event not found.",
                        404,
                    );
                    return true;
                }
                log?.("error", "Failed to delete event.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    calendarId,
                    eventId,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to delete event.",
                    500,
                );
            }
            return true;
        }

        const respondMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)\/events\/([^/]+)\/respond$/,
        );
        if (respondMatch && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(respondMatch[1]);
            const eventId = decodeURIComponent(respondMatch[2]);
            const calendar = gateway.getOwnedCalendar(claims.sub, calendarId);
            const event = calendar
                ? gateway.getEvent(calendarId, eventId)
                : null;
            if (!calendar || !event) {
                sendCalendarError(res, "not_found", "Event not found.", 404);
                return true;
            }
            const body = (await readJson(req)) as { response?: unknown };
            if (
                body.response !== "accepted" &&
                body.response !== "tentative" &&
                body.response !== "declined"
            ) {
                sendCalendarError(
                    res,
                    "bad_request",
                    "Response must be accepted, tentative, or declined.",
                    400,
                );
                return true;
            }
            const response = normalizeResponseValue(body.response);
            const respondAll = url.searchParams.get("series") === "1";
            try {
                const responseRecord = gateway.setEventResponse({
                    eventId,
                    accountId: claims.sub,
                    response,
                    respondAll,
                });
                await gateway.flushStore();
                if (dispatchNotification && event.createdBy !== claims.sub) {
                    try {
                        await dispatchNotification({
                            category: "calendar",
                            recipientUsername: event.createdBy,
                            subject: `Calendar response: ${event.title}`,
                            body: buildResponseNotificationBody(
                                event,
                                claims.sub,
                                response,
                            ),
                            actionUrl: "/calendar",
                            metadata: {
                                eventId: event.id,
                                response,
                                attendee: claims.sub,
                            },
                        });
                    } catch (error) {
                        log?.(
                            "error",
                            "Calendar response notification failed.",
                            {
                                component: "calendar-gateway",
                                eventId,
                                accountId: claims.sub,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
                    }
                }
                sendJson(res, 200, { data: responseRecord });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "calendar_error";
                if (message === "calendar_response_forbidden") {
                    sendCalendarError(
                        res,
                        "forbidden",
                        "Only invited attendees can respond to this event.",
                        403,
                    );
                    return true;
                }
                if (message === "calendar_event_not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Event not found.",
                        404,
                    );
                    return true;
                }
                log?.("error", "Failed to update event response.", {
                    component: "calendar-gateway",
                    eventId,
                    accountId: claims.sub,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to update event response.",
                    500,
                );
            }
            return true;
        }

        const meetingAccessMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/meeting-access\/([^/]+)$/,
        );
        if (meetingAccessMatch && req.method === "GET") {
            const token = decodeURIComponent(meetingAccessMatch[1]);
            const scopedToken = gateway.consumeScopedMeetingAccessToken(token);
            if (!scopedToken) {
                sendCalendarError(
                    res,
                    "not_found",
                    "Meeting access link is invalid or expired.",
                    404,
                );
                return true;
            }
            res.writeHead(302, { location: scopedToken.targetUrl });
            res.end();
            return true;
        }

        return false;
    };
}

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const routeHelpers = resolveRouteContext(routeContext);
    const gateway = new CoreCalendarGateway();
    const adaptersRoot = path.join(ctx.adaptersRoot, "calendar");
    const dbExecutor = ctx.capabilities.get<DbExecutor>("db:executor");
    const resolveAccountId = ctx.capabilities.get<ResolveAccountId>(
        "auth:resolveAccountId",
    );

    if (dbExecutor) {
        try {
            const store = new DbCalendarStore(dbExecutor);
            await store.ensureSchema();
            await gateway.attachStore(store);
        } catch (error) {
            ctx.log?.("error", "Calendar DB store initialization failed.", {
                component: "calendar-gateway",
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    await gateway.discoverAdapters(adaptersRoot);

    const registerNotificationCategory = ctx.capabilities.get<
        (id: string, label: string) => void
    >("notify:registerCategory");
    registerNotificationCategory?.("calendar", "Calendar Events");

    const dispatchNotification =
        ctx.capabilities.get<NotificationDispatcher>("notify:dispatch");

    ctx.capabilities.contribute(
        "calendar:createCalendar",
        (
            ownerAccountId: string,
            name: string,
            visibility?: CalendarVisibility,
            color?: string,
        ) =>
            gateway.createCalendar({
                ownerAccountId,
                name,
                visibility,
                color: normalizeCalendarColor(color),
            }),
    );
    ctx.capabilities.contribute(
        "calendar:listCalendars",
        (ownerAccountId: string) => gateway.listCalendars(ownerAccountId),
    );
    ctx.capabilities.contribute(
        "calendar:addEvent",
        (input: {
            ownerAccountId: string;
            calendarId: string;
            title: string;
            description?: string | null;
            startAt: string;
            endAt: string;
            attendees?: string[];
            inviteEmails?: string[];
            meetingUrl?: string | null;
            status?: "busy" | "free";
            recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
        }) => gateway.addEvent(input),
    );
    ctx.capabilities.contribute("calendar:listEvents", (calendarId: string) =>
        gateway.listEvents(calendarId),
    );
    ctx.capabilities.contribute("calendar:exportIcs", (calendarId: string) =>
        gateway.exportCalendarAsIcs(calendarId),
    );
    ctx.capabilities.contribute(
        "calendar:importIcs",
        (input: { ownerAccountId: string; calendarId: string; ics: string }) =>
            gateway.importIcs(input),
    );

    await gateway.bootstrapAdapters(adaptersRoot, {
        gateway,
        capabilities: ctx.capabilities,
        gatewayRegistry: ctx.gatewayRegistry,
        registerRoute: (handler, gatewayId) =>
            ctx.routeRegistry.register(handler, gatewayId ?? "calendar"),
        log: ctx.log,
        isGatewayEnabled: () =>
            ctx.gatewayRegistry.get("calendar")?.status !== "disabled",
    });

    ctx.routeRegistry.register(
        createCalendarCoreRoutes({
            gateway,
            dispatchNotification: dispatchNotification ?? null,
            routeContext,
            resolveAccountId: resolveAccountId ?? null,
            log: ctx.log,
        }),
        "calendar",
    );

    const serveCalendarHtml = async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method !== "GET" || url.pathname !== "/calendar") return false;
        if (!routeHelpers.getCookieSession(req)) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        routeHelpers.setPageSecurityHeaders(res);
        const html = await readFile(
            path.join(GATEWAY_ROOT, "ui", "index.html"),
            "utf8",
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };

    ctx.routeRegistry.register(serveCalendarHtml, "calendar");
    ctx.routeRegistry.register(
        createCalendarAdapterRoutes(
            "calendar",
            gateway,
            ctx.gatewayRegistry,
            routeContext,
        ),
        "calendar",
    );

    const uiHooks = createGatewayUiRegistryHooks(ctx.uiRegistry, "calendar");
    uiHooks.registerStaticDir("calendar", GATEWAY_ROOT);
    uiHooks.registerNavbarPlugin(
        "/static/gateways/calendar/ui/navbar.js",
        () => ctx.gatewayRegistry.get("calendar")?.status !== "disabled",
    );
    uiHooks.registerSpaRoute({
        id: "calendar-page",
        pattern: "^/calendar$",
        base: "/calendar",
        scriptUrl: "/static/gateways/calendar/ui/app.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/calendar/ui/calendar.css",
        ],
        isEnabled: () =>
            ctx.gatewayRegistry.get("calendar")?.status !== "disabled",
    });

    ctx.gatewayRegistry.register({
        id: "calendar",
        name: "Calendar Gateway",
        version: "1.0.1",
        description:
            "Internal calendar management with pluggable CalDAV and ICS adapters.",
        publisher: "Cognis Labs HQ",
        hasAdapters: true,
    });
}
