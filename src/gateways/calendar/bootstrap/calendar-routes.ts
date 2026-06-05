import type { IncomingMessage, ServerResponse } from "node:http";
import { hasMinRole, type FlowApi } from "@cognis/core";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { normalizeCalendarColor } from "../color.js";
import {
    CoreCalendarGateway,
    type CalendarEventRecord,
} from "../gateway/index.js";
import {
    buildCalendarShareData,
    dispatchCancellationNotifications,
    dispatchInviteNotifications,
    dispatchReminderNotifications,
    errorMessage,
    normalizeAttendeesForOwner,
    normalizeReminderOffsets,
    normalizeStringList,
    normalizeVisibility,
    requireOrganizerOwnedSourceEvent,
    resolveCreatedSeries,
    resolveEventMeta,
    sendCalendarError,
    sendJson,
    type CalendarLogger,
    type NotificationDispatcher,
    type ResolveAccountId,
} from "./helpers.js";
import { handleCalendarResponseRoute } from "./respond-route.js";

export function createCalendarCoreRoutes({
    gateway,
    routeContext,
    flow,
    resolveAccountId,
    log,
    getDispatchNotification,
    ensureNotificationCategory,
}: {
    gateway: CoreCalendarGateway;
    routeContext?: RouteContext;
    flow: FlowApi;
    resolveAccountId: ResolveAccountId | null;
    log?: CalendarLogger;
    getDispatchNotification: () => NotificationDispatcher | null;
    ensureNotificationCategory: () => void;
}): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    const ctx = resolveRouteContext(routeContext);
    const externalHost =
        process.env.EXTERNAL_HOST ??
        (process.env.HOST ? `http://${process.env.HOST}` : "");
    const JITSI_AVAILABILITY_CACHE_TTL_MS = 60 * 1000;
    const MAX_SET_TIMEOUT_DELAY_MS = 2_147_483_647;
    let cachedJitsiAvailability: boolean | null = null;
    let cachedJitsiAvailabilityAtMs = 0;
    const scheduledReminderTimers = new Map<
        string,
        ReturnType<typeof setTimeout>
    >();
    const reminderKeysByEventId = new Map<string, Set<string>>();

    const removeReminderKey = (eventId: string, reminderKey: string) => {
        const reminderKeys = reminderKeysByEventId.get(eventId);
        if (!reminderKeys) return;
        reminderKeys.delete(reminderKey);
        if (reminderKeys.size === 0) {
            reminderKeysByEventId.delete(eventId);
        }
    };

    const clearScheduledReminderTimersForEvent = (eventId: string) => {
        const reminderKeys = reminderKeysByEventId.get(eventId);
        if (!reminderKeys) return;
        for (const reminderKey of reminderKeys) {
            const timer = scheduledReminderTimers.get(reminderKey);
            if (!timer) continue;
            clearTimeout(timer);
            scheduledReminderTimers.delete(reminderKey);
            removeReminderKey(eventId, reminderKey);
        }
    };

    const scheduleReminderNotificationsForEvent = (
        event: CalendarEventRecord,
    ) => {
        clearScheduledReminderTimersForEvent(event.id);
        const reminderOffsets = normalizeReminderOffsets(
            event.reminderOffsetsMinutes,
        );
        if (reminderOffsets.length === 0 || event.attendees.length === 0) {
            return;
        }
        const eventStartAtMs = Date.parse(event.startAt);
        if (!Number.isFinite(eventStartAtMs)) return;
        for (const attendee of event.attendees) {
            for (const reminderOffsetMinutes of reminderOffsets) {
                const reminderAtMs =
                    eventStartAtMs - reminderOffsetMinutes * 60_000;
                const initialDelayMs = reminderAtMs - Date.now();
                if (!Number.isFinite(initialDelayMs) || initialDelayMs <= 0) {
                    continue;
                }
                const reminderKey = `${event.id}:${attendee}:${reminderOffsetMinutes}`;
                const scheduleDispatch = (remainingDelayMs: number) => {
                    const delayMs = Math.min(
                        remainingDelayMs,
                        MAX_SET_TIMEOUT_DELAY_MS,
                    );
                    const timer = setTimeout(async () => {
                        if (!scheduledReminderTimers.has(reminderKey)) return;
                        if (remainingDelayMs > MAX_SET_TIMEOUT_DELAY_MS) {
                            scheduleDispatch(
                                remainingDelayMs - MAX_SET_TIMEOUT_DELAY_MS,
                            );
                            return;
                        }
                        scheduledReminderTimers.delete(reminderKey);
                        removeReminderKey(event.id, reminderKey);
                        const dispatchNotification = getDispatchNotification();
                        if (!dispatchNotification) return;
                        await dispatchReminderNotifications({
                            dispatchNotification,
                            event: {
                                ...event,
                                attendees: [attendee],
                                reminderOffsetsMinutes: [reminderOffsetMinutes],
                            },
                            resolveAccountId,
                            log,
                        });
                    }, delayMs);
                    if (typeof timer.unref === "function") {
                        timer.unref();
                    }
                    scheduledReminderTimers.set(reminderKey, timer);
                    const eventReminderKeys =
                        reminderKeysByEventId.get(event.id) ?? new Set();
                    eventReminderKeys.add(reminderKey);
                    reminderKeysByEventId.set(event.id, eventReminderKeys);
                };
                scheduleDispatch(initialDelayMs);
            }
        }
    };

    const resolveJitsiAvailability = async (): Promise<boolean> => {
        const now = Date.now();
        if (
            cachedJitsiAvailability !== null &&
            now - cachedJitsiAvailabilityAtMs < JITSI_AVAILABILITY_CACHE_TTL_MS
        ) {
            return cachedJitsiAvailability;
        }
        if (!flow.exists("construct-meetings-ui")) return false;
        try {
            const result = await flow.run("construct-meetings-ui", {});
            const providerResults =
                result.stageResults["resolve-providers"] ?? [];
            if (!Array.isArray(providerResults)) return false;
            cachedJitsiAvailability = providerResults.some((entry) => {
                if (!entry || typeof entry !== "object") return false;
                const providerId = String(
                    (entry as { providerId?: unknown }).providerId ?? "",
                ).trim();
                return providerId === "jitsi-meet";
            });
            cachedJitsiAvailabilityAtMs = now;
            return cachedJitsiAvailability;
        } catch (error) {
            log?.(
                "warn",
                "Failed to resolve meetings provider availability; defaulting to unavailable.",
                {
                    component: "calendar-gateway",
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
            cachedJitsiAvailability = false;
            cachedJitsiAvailabilityAtMs = now;
            return false;
        }
    };

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        ensureNotificationCategory();
        const dispatchNotification = getDispatchNotification();
        if (
            url.pathname === "/api/v1/calendar/calendars" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            gateway.ensureDefaultCalendar(claims.sub);
            const jitsiAvailable = await resolveJitsiAvailability();
            sendJson(res, 200, {
                data: gateway.listCalendars(claims.sub),
                meta: {
                    canInviteExternal: hasMinRole(claims.role, "admin"),
                    currentAccountId: claims.sub,
                    jitsiAvailable,
                },
            });
            return true;
        }

        if (
            url.pathname === "/api/v1/calendar/invitations" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            sendJson(res, 200, {
                data: gateway.listInvitedPendingEvents(claims.sub),
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
                defaultReminderOffsetsMinutes?: unknown;
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
                    defaultReminderOffsetsMinutes: normalizeReminderOffsets(
                        body?.defaultReminderOffsetsMinutes,
                    ),
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
                    defaultReminderOffsetsMinutes:
                        body?.defaultReminderOffsetsMinutes !== undefined
                            ? normalizeReminderOffsets(
                                  body.defaultReminderOffsetsMinutes,
                              )
                            : undefined,
                });
                await gateway.flushStore();
                sendJson(res, 200, { data: updated });
            } catch (error) {
                const message = errorMessage(error);
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
                const ownedCalendar = gateway.getOwnedCalendar(
                    claims.sub,
                    calendarId,
                );
                if (!ownedCalendar) {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Calendar not found.",
                        404,
                    );
                    return true;
                }
                const deletedEventIds = gateway
                    .listEvents(calendarId)
                    .map((event) => event.id);
                gateway.deleteCalendar({
                    ownerAccountId: claims.sub,
                    calendarId,
                });
                deletedEventIds.forEach((eventId) => {
                    clearScheduledReminderTimersForEvent(eventId);
                });
                await gateway.flushStore();
                sendJson(res, 200, { data: { deleted: true } });
            } catch (error) {
                const message = errorMessage(error);
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
            const body = (await readJson(req)) as {
                permission?: unknown;
                expiresInHours?: unknown;
                name?: unknown;
            };
            const shareData = buildCalendarShareData({
                gateway,
                ownerAccountId: claims.sub,
                calendarId,
                permission: body.permission,
                expiresInHours: body.expiresInHours,
                name: typeof body.name === "string" ? body.name : undefined,
                externalHost,
            });
            if (!shareData) {
                sendCalendarError(res, "not_found", "Calendar not found.", 404);
                return true;
            }
            sendJson(res, 200, { data: shareData });
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
            const body = (await readJson(req)) as Record<string, unknown>;
            const title = String(body?.title ?? "").trim();
            const startAt = String(body?.startAt ?? "").trim();
            const endAt = String(body?.endAt ?? "").trim();
            const inviteEmails = normalizeStringList(body.inviteEmails);
            const reminderOffsetsMinutes = normalizeReminderOffsets(
                body.reminderOffsetsMinutes,
            );
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
                    reminderOffsetsMinutes,
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
                createdSeries.forEach((event) => {
                    scheduleReminderNotificationsForEvent(event);
                });
                sendJson(res, 201, { data: createdEvent });
            } catch (error) {
                const message = errorMessage(error);
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
            const ownedCalendar = gateway.getOwnedCalendar(
                claims.sub,
                calendarId,
            );
            const ownedEvent = ownedCalendar
                ? gateway.getEvent(calendarId, eventId)
                : null;
            let invitedEvent = null;
            if (!ownedCalendar) {
                const fetchedEvent = gateway.getEvent(calendarId, eventId);
                invitedEvent = fetchedEvent?.attendees.includes(claims.sub)
                    ? fetchedEvent
                    : null;
            }
            const effectiveCalendar =
                ownedCalendar ?? gateway.getCalendar(calendarId);
            const effectiveEvent = ownedEvent ?? invitedEvent;
            if (!effectiveCalendar || !effectiveEvent) {
                sendCalendarError(res, "not_found", "Event not found.", 404);
                return true;
            }
            sendJson(res, 200, {
                data: {
                    calendar: effectiveCalendar,
                    event: effectiveEvent,
                    meta: resolveEventMeta(
                        effectiveEvent,
                        claims.sub,
                        gateway.getEventResponse(effectiveEvent.id, claims.sub),
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
            const body = (await readJson(req)) as Record<string, unknown>;
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
                    reminderOffsetsMinutes: Array.isArray(
                        body.reminderOffsetsMinutes,
                    )
                        ? normalizeReminderOffsets(body.reminderOffsetsMinutes)
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
                await gateway.flushStore();
                updatedSeries.forEach((event) => {
                    scheduleReminderNotificationsForEvent(event);
                });
                sendJson(res, 200, { data: updatedEvent });
            } catch (error) {
                const message = errorMessage(error);
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
                deletedEvents.forEach((deletedEvent) => {
                    clearScheduledReminderTimersForEvent(deletedEvent.id);
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
                const message = errorMessage(error);
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
            await handleCalendarResponseRoute({
                req,
                res,
                url,
                claims,
                calendarId: decodeURIComponent(respondMatch[1]),
                eventId: decodeURIComponent(respondMatch[2]),
                gateway,
                dispatchNotification,
                log,
            });
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
