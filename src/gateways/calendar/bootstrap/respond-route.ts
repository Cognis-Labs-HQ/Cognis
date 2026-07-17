import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../api/reuse/read-json.js";
import type {
    CalendarEventRecord,
    CoreCalendarGateway,
} from "../gateway/index.js";
import {
    buildResponseNotificationBody,
    buildResponseNotificationSubject,
    errorMessage,
    normalizeResponseValue,
    sendCalendarError,
    sendJson,
    type CalendarLogger,
    type EventLocationRef,
    type NotificationDispatcher,
} from "./helpers.js";
import type { CalendarShareRegistry } from "./share-registry.js";

export async function handleCalendarResponseRoute(input: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    claims: { sub: string };
    calendarId: string;
    eventId: string;
    gateway: CoreCalendarGateway;
    shareRegistry: CalendarShareRegistry;
    dispatchNotification: NotificationDispatcher | null;
    resolveAccountDisplayName?: (accountId: string) => Promise<string> | string;
    onEventUpdatedForReminders?: (event: CalendarEventRecord) => void;
    log?: CalendarLogger;
}): Promise<void> {
    const sharedCalendar = await input.shareRegistry.getByRecipientCalendarId(
        input.calendarId,
    );
    const activeSharedCalendar =
        sharedCalendar?.recipientAccountId === input.claims.sub
            ? sharedCalendar
            : null;
    const lookupCalendarId = activeSharedCalendar
        ? activeSharedCalendar.ownerCalendarId
        : input.calendarId;
    const ownedCalendar = input.gateway.getOwnedCalendar(
        input.claims.sub,
        lookupCalendarId,
    );
    const event =
        ownedCalendar || activeSharedCalendar
            ? input.gateway.getEvent(lookupCalendarId, input.eventId)
            : null;
    // Also allow responding when the user is an attendee on a non-owned event
    let invitedEvent = null;
    if (!ownedCalendar && !activeSharedCalendar) {
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
        if (response === "declined") {
            input.gateway.removeDeclinedAttendee({
                eventId: input.eventId,
                accountId: input.claims.sub,
                removeAll: respondAll,
            });
            const reminderEvents =
                respondAll && effectiveEvent.recurrenceId
                    ? input.gateway
                          .listEvents(lookupCalendarId)
                          .filter(
                              (event) =>
                                  event.recurrenceId ===
                                      effectiveEvent.recurrenceId &&
                                  event.sourceEventId === null,
                          )
                    : [
                          input.gateway.getEvent(
                              lookupCalendarId,
                              input.eventId,
                          ) ?? effectiveEvent,
                      ];
            reminderEvents.forEach((event) => {
                input.onEventUpdatedForReminders?.(event);
            });
        }
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
                movedTo = {
                    calendarId: targetCalendarId,
                    eventId: input.eventId,
                };
            } else if (invitedEvent) {
                // Non-owned invitation: create personal copies in the target calendar.
                const sourceOccurrences =
                    invitedEvent.recurrenceId === null
                        ? [invitedEvent]
                        : input.gateway
                              .listEvents(invitedEvent.calendarId)
                              .filter(
                                  (event) =>
                                      event.recurrenceId ===
                                          invitedEvent.recurrenceId &&
                                      event.sourceEventId === null,
                              );
                const fallbackOccurrences =
                    sourceOccurrences.length > 0
                        ? sourceOccurrences
                        : [invitedEvent];
                if (
                    invitedEvent.recurrenceId !== null &&
                    sourceOccurrences.length === 0
                ) {
                    input.log?.(
                        "warn",
                        "Recurring invite response resolved no source occurrences; using selected event fallback.",
                        {
                            component: "calendar-gateway",
                            eventId: invitedEvent.id,
                            recurrenceId: invitedEvent.recurrenceId,
                            calendarId: invitedEvent.calendarId,
                            targetCalendarId,
                        },
                    );
                }
                const existingTargetEvents =
                    input.gateway.listEvents(targetCalendarId);
                const copyBySourceEventId = new Map(
                    existingTargetEvents
                        .filter(
                            (event) => typeof event.sourceEventId === "string",
                        )
                        .map((event) => [event.sourceEventId as string, event]),
                );
                let movedEventId: string | null = null;
                for (const sourceOccurrence of fallbackOccurrences) {
                    const sourceOccurrenceId =
                        sourceOccurrence.sourceEventId ?? sourceOccurrence.id;
                    const existingCopy =
                        copyBySourceEventId.get(sourceOccurrenceId);
                    if (existingCopy) {
                        if (
                            sourceOccurrence.id === invitedEvent.id &&
                            movedEventId === null
                        ) {
                            movedEventId = existingCopy.id;
                        }
                        continue;
                    }
                    const copy = input.gateway.addEventToCalendar({
                        calendarId: targetCalendarId,
                        sourceEventId: sourceOccurrenceId,
                        title: sourceOccurrence.title,
                        description: sourceOccurrence.description,
                        startAt: sourceOccurrence.startAt,
                        endAt: sourceOccurrence.endAt,
                        createdBy: sourceOccurrence.createdBy,
                        attendees: sourceOccurrence.attendees,
                        inviteEmails: sourceOccurrence.inviteEmails,
                        reminderOffsetsMinutes:
                            sourceOccurrence.reminderOffsetsMinutes,
                        meetingUrl: sourceOccurrence.meetingUrl,
                        status: sourceOccurrence.status,
                        recurrence: sourceOccurrence.recurrence,
                        recurrenceId: sourceOccurrence.recurrenceId,
                        forceSingle: true,
                    });
                    copyBySourceEventId.set(sourceOccurrenceId, copy);
                    if (sourceOccurrence.id === invitedEvent.id) {
                        movedEventId = copy.id;
                    }
                }
                const resolvedMovedEventId =
                    movedEventId ??
                    copyBySourceEventId.get(
                        invitedEvent.sourceEventId ?? invitedEvent.id,
                    )?.id;
                if (resolvedMovedEventId) {
                    movedTo = {
                        calendarId: targetCalendarId,
                        eventId: resolvedMovedEventId,
                    };
                }
            }
        }
        await input.gateway.flushStore();
        if (
            input.dispatchNotification &&
            effectiveEvent.createdBy !== input.claims.sub
        ) {
            try {
                const attendeeDisplayName = input.resolveAccountDisplayName
                    ? await input.resolveAccountDisplayName(input.claims.sub)
                    : input.claims.sub;
                await input.dispatchNotification({
                    category: "calendar",
                    recipientUsername: effectiveEvent.createdBy,
                    subject: buildResponseNotificationSubject(response),
                    body: buildResponseNotificationBody(
                        effectiveEvent,
                        attendeeDisplayName,
                        response,
                    ),
                    actionUrl: "/calendar",
                    senderName: attendeeDisplayName,
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
