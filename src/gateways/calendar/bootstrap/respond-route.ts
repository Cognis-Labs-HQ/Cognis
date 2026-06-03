import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../api/reuse/read-json.js";
import type { CoreCalendarGateway } from "../gateway.js";
import {
    buildResponseNotificationBody,
    errorMessage,
    normalizeResponseValue,
    sendCalendarError,
    sendJson,
    type CalendarLogger,
    type EventLocationRef,
    type NotificationDispatcher,
} from "./helpers.js";

export async function handleCalendarResponseRoute(input: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    claims: { sub: string };
    calendarId: string;
    eventId: string;
    gateway: CoreCalendarGateway;
    dispatchNotification: NotificationDispatcher | null;
    log?: CalendarLogger;
}): Promise<void> {
    const ownedCalendar = input.gateway.getOwnedCalendar(
        input.claims.sub,
        input.calendarId,
    );
    const event = ownedCalendar
        ? input.gateway.getEvent(input.calendarId, input.eventId)
        : null;
    // Also allow responding when the user is an attendee on a non-owned event
    let invitedEvent = null;
    if (!ownedCalendar) {
        const ev = input.gateway.getEvent(input.calendarId, input.eventId);
        invitedEvent = ev?.attendees.includes(input.claims.sub) ? ev : null;
    }
    const effectiveEvent = event ?? invitedEvent;
    if (!effectiveEvent) {
        sendCalendarError(input.res, "not_found", "Event not found.", 404);
        return;
    }
    const body = (await readJson(input.req)) as {
        response?: unknown;
        targetCalendarId?: unknown;
    };
    const targetCalendarId =
        typeof body.targetCalendarId === "string" &&
        body.targetCalendarId.trim()
            ? body.targetCalendarId.trim()
            : null;
    if (
        body.response !== "accepted" &&
        body.response !== "tentative" &&
        body.response !== "declined"
    ) {
        sendCalendarError(
            input.res,
            "bad_request",
            "Response must be accepted, tentative, or declined.",
            400,
        );
        return;
    }
    const response = normalizeResponseValue(body.response);
    const respondAll = input.url.searchParams.get("series") === "1";
    try {
        if (
            (response === "accepted" || response === "tentative") &&
            targetCalendarId &&
            !input.gateway.getOwnedCalendar(input.claims.sub, targetCalendarId)
        ) {
            throw new Error("calendar_not_found");
        }
        const responseRecord = input.gateway.setEventResponse({
            eventId: input.eventId,
            accountId: input.claims.sub,
            response,
            respondAll,
        });
        let movedTo: EventLocationRef | null = null;
        if (
            (response === "accepted" || response === "tentative") &&
            targetCalendarId
        ) {
            if (ownedCalendar) {
                // Owned mirror event: move it to the target calendar
                input.gateway.moveOwnedEvent({
                    ownerAccountId: input.claims.sub,
                    calendarId: input.calendarId,
                    eventId: input.eventId,
                    targetCalendarId,
                    moveAll: respondAll,
                });
                movedTo = { calendarId: targetCalendarId, eventId: input.eventId };
            } else if (invitedEvent) {
                // Non-owned invitation: create a personal copy in the target calendar
                const copy = input.gateway.addEventToCalendar({
                    calendarId: targetCalendarId,
                    sourceEventId: invitedEvent.sourceEventId ?? invitedEvent.id,
                    title: invitedEvent.title,
                    description: invitedEvent.description,
                    startAt: invitedEvent.startAt,
                    endAt: invitedEvent.endAt,
                    createdBy: invitedEvent.createdBy,
                    attendees: invitedEvent.attendees,
                    inviteEmails: invitedEvent.inviteEmails,
                    reminderOffsetsMinutes: invitedEvent.reminderOffsetsMinutes,
                    meetingUrl: invitedEvent.meetingUrl,
                    status: invitedEvent.status,
                    recurrence: invitedEvent.recurrence,
                    recurrenceId: invitedEvent.recurrenceId,
                    forceSingle: true,
                });
                movedTo = { calendarId: targetCalendarId, eventId: copy.id };
            }
        }
        await input.gateway.flushStore();
        if (
            input.dispatchNotification &&
            effectiveEvent.createdBy !== input.claims.sub
        ) {
            try {
                await input.dispatchNotification({
                    category: "calendar",
                    recipientUsername: effectiveEvent.createdBy,
                    subject: `Calendar response: ${effectiveEvent.title}`,
                    body: buildResponseNotificationBody(
                        effectiveEvent,
                        input.claims.sub,
                        response,
                    ),
                    actionUrl: "/calendar",
                    metadata: {
                        eventId: effectiveEvent.id,
                        response,
                        attendee: input.claims.sub,
                    },
                });
            } catch (error) {
                input.log?.("error", "Calendar response notification failed.", {
                    component: "calendar-gateway",
                    eventId: input.eventId,
                    accountId: input.claims.sub,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }
        sendJson(input.res, 200, {
            data: { ...responseRecord, ...(movedTo ? { movedTo } : {}) },
        });
    } catch (error) {
        const message = errorMessage(error);
        if (message === "calendar_response_forbidden") {
            sendCalendarError(
                input.res,
                "forbidden",
                "Only invited attendees can respond to this event.",
                403,
            );
            return;
        }
        if (message === "calendar_event_not_found") {
            sendCalendarError(input.res, "not_found", "Event not found.", 404);
            return;
        }
        if (message === "calendar_not_found") {
            sendCalendarError(
                input.res,
                "not_found",
                "Calendar not found.",
                404,
            );
            return;
        }
        input.log?.("error", "Failed to update event response.", {
            component: "calendar-gateway",
            eventId: input.eventId,
            accountId: input.claims.sub,
            error: message,
        });
        sendCalendarError(
            input.res,
            "internal_error",
            "Failed to update event response.",
            500,
        );
    }
}
