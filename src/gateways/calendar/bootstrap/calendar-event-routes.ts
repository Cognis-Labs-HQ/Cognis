import type { IncomingMessage, ServerResponse } from "node:http";
import { hasMinRole } from "@cognis/core";
import { readJson } from "../../../api/reuse/read-json.js";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import type { CoreCalendarGateway } from "../gateway/index.js";
import type { CalendarEventRecord } from "../gateway/utils.js";
import {
    dispatchCancellationNotifications,
    dispatchInviteNotifications,
    errorMessage,
    normalizeAttendeesForOwner,
    normalizeReminderOffsets,
    normalizeStringList,
    requireOrganizerOwnedSourceEvent,
    requireWritableSharedSourceEvent,
    resolveCreatedSeries,
    resolveEventMeta as resolveEventMetadata,
    resolveAvailabilityStatus,
    sendCalendarError,
    sendJson,
    validateSharedCalendars,
    type CalendarLogger,
    type NotificationDispatcher,
    type ResolveAccountDisplayName,
    type ResolveAccountId,
} from "./helpers.js";
import type { CalendarShareRegistry } from "./share-registry.js";
import { requireSharedCalendarAccess } from "./shared-access.js";
import { rejectInactiveSharedCalendar } from "./shared-calendar-guards.js";

export async function handleCalendarEventRoutes({
    req: request,
    res: response,
    url,
    ctx,
    gateway,
    shareRegistry,
    getCapability,
    clearScheduledReminderTimersForEvent,
    scheduleReminderNotificationsForEvent,
    dispatchNotification,
    resolveAccountId,
    resolveAccountDisplayName,
    log,
}: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    ctx: RouteContext;
    gateway: CoreCalendarGateway;
    shareRegistry: CalendarShareRegistry;
    getCapability: <T>(capabilityId: string) => T | undefined;
    clearScheduledReminderTimersForEvent: (eventId: string) => void;
    scheduleReminderNotificationsForEvent: (event: CalendarEventRecord) => void;
    dispatchNotification: NotificationDispatcher | null;
    resolveAccountId: ResolveAccountId | null;
    resolveAccountDisplayName: ResolveAccountDisplayName | null;
    log?: CalendarLogger;
}): Promise<boolean> {
    const eventMatch = url.pathname.match(
        /^\/api\/v1\/calendar\/calendars\/([^/]+)\/events\/([^/]+)$/,
    );
    if (eventMatch && request.method === "GET") {
        const claims = ctx.requireAuth(request, response, "user");
        if (!claims) return true;
        const calendarId = decodeURIComponent(eventMatch[1]);
        const eventId = decodeURIComponent(eventMatch[2]);
        const sharedCalendar =
            await shareRegistry.getByRecipientCalendarId(calendarId);
        const activeSharedCalendar =
            sharedCalendar?.recipientAccountId === claims.sub
                ? sharedCalendar
                : null;
        if (
            activeSharedCalendar &&
            !(await requireSharedCalendarAccess({
                req: request,
                res: response,
                shareTokenId: activeSharedCalendar.shareTokenId,
                accountId: claims.sub,
                ownerCalendarId: activeSharedCalendar.ownerCalendarId,
                getCapability,
            }))
        ) {
            return true;
        }
        if (
            rejectInactiveSharedCalendar({
                gateway,
                accountId: claims.sub,
                calendarId,
                activeShare: activeSharedCalendar,
                res: response,
            })
        ) {
            return true;
        }
        const ownedCalendar = activeSharedCalendar
            ? null
            : gateway.getOwnedCalendar(claims.sub, calendarId);
        const ownedEvent = ownedCalendar
            ? gateway.getEvent(calendarId, eventId)
            : activeSharedCalendar
              ? gateway.getEvent(activeSharedCalendar.ownerCalendarId, eventId)
              : null;
        let invitedEvent = null;
        if (!ownedCalendar && !activeSharedCalendar) {
            const fetchedEvent = gateway.getEvent(calendarId, eventId);
            invitedEvent = fetchedEvent?.attendees.includes(claims.sub)
                ? fetchedEvent
                : null;
        }
        const effectiveCalendar =
            ownedCalendar ?? gateway.getCalendar(calendarId);
        const effectiveEvent = ownedEvent ?? invitedEvent;
        if (!effectiveCalendar || !effectiveEvent) {
            sendCalendarError(response, "not_found", "Event not found.", 404);
            return true;
        }
        sendJson(response, 200, {
            data: {
                calendar: effectiveCalendar,
                event: effectiveEvent,
                meta: resolveEventMetadata(
                    effectiveEvent,
                    claims.sub,
                    gateway.getEventResponse(effectiveEvent.id, claims.sub),
                    activeSharedCalendar?.permission ?? null,
                ),
            },
        });
        return true;
    }

    if (eventMatch && request.method === "PATCH") {
        const claims = ctx.requireAuth(request, response, "user");
        if (!claims) return true;
        const calendarId = decodeURIComponent(eventMatch[1]);
        const eventId = decodeURIComponent(eventMatch[2]);
        const sharedCalendar =
            await shareRegistry.getByRecipientCalendarId(calendarId);
        const activeSharedCalendar =
            sharedCalendar?.recipientAccountId === claims.sub
                ? sharedCalendar
                : null;
        if (
            activeSharedCalendar &&
            !(await requireSharedCalendarAccess({
                req: request,
                res: response,
                shareTokenId: activeSharedCalendar.shareTokenId,
                accountId: claims.sub,
                ownerCalendarId: activeSharedCalendar.ownerCalendarId,
                requiredCapability: "calendar:write",
                getCapability,
            }))
        ) {
            return true;
        }
        if (
            rejectInactiveSharedCalendar({
                gateway,
                accountId: claims.sub,
                calendarId,
                activeShare: activeSharedCalendar,
                res: response,
            })
        ) {
            return true;
        }
        const ownerAccountId =
            activeSharedCalendar?.ownerAccountId ?? claims.sub;
        const sourceCalendarId =
            activeSharedCalendar?.ownerCalendarId ?? calendarId;
        const existingEvent = gateway.getEvent(sourceCalendarId, eventId);
        const body = (await readJson(request)) as Record<string, unknown>;
        if (
            activeSharedCalendar &&
            (body.attendees !== undefined || body.inviteEmails !== undefined)
        ) {
            sendCalendarError(
                response,
                "forbidden",
                "Shared calendar recipients cannot change event participants or responses.",
                403,
            );
            return true;
        }
        const inviteEmails = normalizeStringList(body.inviteEmails);
        const canInviteByEmail = hasMinRole(claims.role, "admin");
        if (inviteEmails.length > 0 && !canInviteByEmail) {
            sendCalendarError(
                response,
                "forbidden",
                "Only founder or admin users can send email invites.",
                403,
            );
            return true;
        }
        if (
            activeSharedCalendar &&
            !requireWritableSharedSourceEvent({
                gateway,
                sharedCalendar: activeSharedCalendar,
                eventId,
                res: response,
            })
        ) {
            return true;
        }
        if (
            !activeSharedCalendar &&
            !requireOrganizerOwnedSourceEvent({
                gateway,
                ownerAccountId: claims.sub,
                calendarId,
                eventId,
                res: response,
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
                ownerAccountId,
                calendarId: sourceCalendarId,
                eventId,
                title: typeof body.title === "string" ? body.title : undefined,
                description:
                    typeof body.description === "string" ||
                    body.description === null
                        ? body.description
                        : undefined,
                startAt:
                    typeof body.startAt === "string" ? body.startAt : undefined,
                endAt: typeof body.endAt === "string" ? body.endAt : undefined,
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
                    body.status === undefined
                        ? undefined
                        : resolveAvailabilityStatus(
                              body.status,
                              getCapability,
                              existingEvent?.status ?? "busy",
                          ),
                recurrence:
                    body.recurrence === "daily" ||
                    body.recurrence === "weekly" ||
                    body.recurrence === "monthly" ||
                    body.recurrence === "yearly" ||
                    body.recurrence === "none"
                        ? body.recurrence
                        : undefined,
                targetCalendarId:
                    !activeSharedCalendar && typeof body.calendarId === "string"
                        ? body.calendarId
                        : undefined,
                updateAll: body.updateAll === true,
            });
            const updatedCalendarId =
                !activeSharedCalendar &&
                typeof body.calendarId === "string" &&
                body.calendarId.trim().length > 0
                    ? body.calendarId.trim()
                    : sourceCalendarId;
            const updatedSeries = resolveCreatedSeries(
                gateway,
                updatedCalendarId,
                updatedEvent,
            );
            await gateway.flushStore();
            updatedSeries.forEach((event) => {
                scheduleReminderNotificationsForEvent(event);
            });
            sendJson(response, 200, { data: updatedEvent });
        } catch (error) {
            const message = errorMessage(error);
            if (message === "calendar_not_found") {
                sendCalendarError(
                    response,
                    "not_found",
                    "Calendar not found.",
                    404,
                );
                return true;
            }
            if (message === "calendar_event_not_found") {
                sendCalendarError(
                    response,
                    "not_found",
                    "Event not found.",
                    404,
                );
                return true;
            }
            if (message === "calendar_invalid_range") {
                sendCalendarError(
                    response,
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
                response,
                "internal_error",
                "Failed to update event.",
                500,
            );
        }
        return true;
    }

    if (eventMatch && request.method === "DELETE") {
        const claims = ctx.requireAuth(request, response, "user");
        if (!claims) return true;
        const calendarId = decodeURIComponent(eventMatch[1]);
        const eventId = decodeURIComponent(eventMatch[2]);
        const sharedCalendar =
            await shareRegistry.getByRecipientCalendarId(calendarId);
        const activeSharedCalendar =
            sharedCalendar?.recipientAccountId === claims.sub
                ? sharedCalendar
                : null;
        if (
            activeSharedCalendar &&
            !(await requireSharedCalendarAccess({
                req: request,
                res: response,
                shareTokenId: activeSharedCalendar.shareTokenId,
                accountId: claims.sub,
                ownerCalendarId: activeSharedCalendar.ownerCalendarId,
                requiredCapability: "calendar:write",
                getCapability,
            }))
        ) {
            return true;
        }
        if (
            rejectInactiveSharedCalendar({
                gateway,
                accountId: claims.sub,
                calendarId,
                activeShare: activeSharedCalendar,
                res: response,
            })
        ) {
            return true;
        }
        const ownerAccountId =
            activeSharedCalendar?.ownerAccountId ?? claims.sub;
        const sourceCalendarId =
            activeSharedCalendar?.ownerCalendarId ?? calendarId;
        try {
            if (
                activeSharedCalendar &&
                !requireWritableSharedSourceEvent({
                    gateway,
                    sharedCalendar: activeSharedCalendar,
                    eventId,
                    res: response,
                })
            ) {
                return true;
            }
            if (
                !activeSharedCalendar &&
                !requireOrganizerOwnedSourceEvent({
                    gateway,
                    ownerAccountId: claims.sub,
                    calendarId,
                    eventId,
                    res: response,
                    actionVerb: "delete",
                })
            ) {
                return true;
            }
            const deletedEvents = gateway.deleteEvent({
                ownerAccountId,
                calendarId: sourceCalendarId,
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
            sendJson(response, 200, { data: { deleted: true } });
        } catch (error) {
            const message = errorMessage(error);
            if (message === "calendar_event_not_found") {
                sendCalendarError(
                    response,
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
                response,
                "internal_error",
                "Failed to delete event.",
                500,
            );
        }
        return true;
    }
    return false;
}
