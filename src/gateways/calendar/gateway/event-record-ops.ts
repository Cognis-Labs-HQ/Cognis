import type {
    CalendarEventRecord,
    CalendarEventResponse,
    CalendarEventResponseRecord,
    CalendarRecord,
} from "./utils.js";

export function synchronizeAttendeeResponses(input: {
    responsesByRootEvent: Map<string, Map<string, CalendarEventResponseRecord>>;
    rootEventId: string;
    attendees: string[];
    acceptedAccountId: string | null;
    saveResponse: (response: CalendarEventResponseRecord) => void;
    deleteResponse: (accountId: string) => void;
}): void {
    const existingResponses =
        input.responsesByRootEvent.get(input.rootEventId) ?? new Map();
    const nextAccountIds = new Set(input.attendees);
    for (const attendee of input.attendees) {
        if (existingResponses.has(attendee)) continue;
        const now = new Date().toISOString();
        const response: CalendarEventResponseRecord = {
            rootEventId: input.rootEventId,
            accountId: attendee,
            response:
                attendee === input.acceptedAccountId ? "accepted" : "pending",
            createdAt: now,
            updatedAt: now,
        };
        existingResponses.set(attendee, response);
        input.saveResponse(response);
    }
    for (const accountId of existingResponses.keys()) {
        if (nextAccountIds.has(accountId)) continue;
        existingResponses.delete(accountId);
        input.deleteResponse(accountId);
    }
    if (existingResponses.size > 0) {
        input.responsesByRootEvent.set(input.rootEventId, existingResponses);
    } else {
        input.responsesByRootEvent.delete(input.rootEventId);
    }
}

export function upsertCalendarRecord(
    calendarsById: Map<string, CalendarRecord>,
    calendarIdsByOwner: Map<string, Set<string>>,
    calendar: CalendarRecord,
): void {
    calendarsById.set(calendar.id, calendar);
    const ownerCalendars =
        calendarIdsByOwner.get(calendar.ownerAccountId) ?? new Set();
    ownerCalendars.add(calendar.id);
    calendarIdsByOwner.set(calendar.ownerAccountId, ownerCalendars);
}

export function buildEventResponses(
    event: CalendarEventRecord,
    responseRecords: Map<string, CalendarEventResponseRecord> | undefined,
): Record<string, CalendarEventResponse> {
    const responses: Record<string, CalendarEventResponse> = {};
    for (const attendee of event.attendees) {
        responses[attendee] =
            responseRecords?.get(attendee)?.response ?? "pending";
    }
    return responses;
}

export function setResponseRecord(
    responsesByRootEvent: Map<string, Map<string, CalendarEventResponseRecord>>,
    record: CalendarEventResponseRecord,
): void {
    const rootResponses =
        responsesByRootEvent.get(record.rootEventId) ?? new Map();
    rootResponses.set(record.accountId, record);
    responsesByRootEvent.set(record.rootEventId, rootResponses);
}

export function upsertEventRecord(
    eventsByCalendar: Map<string, CalendarEventRecord[]>,
    event: CalendarEventRecord,
): void {
    const existingEvents = eventsByCalendar.get(event.calendarId) ?? [];
    const nextEvents = existingEvents.filter(
        (existingEvent) => existingEvent.id !== event.id,
    );
    nextEvents.push(event);
    nextEvents.sort((leftEvent, rightEvent) =>
        leftEvent.startAt.localeCompare(rightEvent.startAt),
    );
    eventsByCalendar.set(event.calendarId, nextEvents);
}

export function removeEventRecord(
    eventsByCalendar: Map<string, CalendarEventRecord[]>,
    event: CalendarEventRecord,
): void {
    const existingEvents = eventsByCalendar.get(event.calendarId) ?? [];
    const nextEvents = existingEvents.filter(
        (existingEvent) => existingEvent.id !== event.id,
    );
    if (nextEvents.length > 0) {
        eventsByCalendar.set(event.calendarId, nextEvents);
        return;
    }
    eventsByCalendar.delete(event.calendarId);
}

export function moveEventRecord(
    eventsByCalendar: Map<string, CalendarEventRecord[]>,
    previousCalendarId: string,
    event: CalendarEventRecord,
): void {
    if (previousCalendarId !== event.calendarId) {
        const previousEvents = eventsByCalendar.get(previousCalendarId) ?? [];
        const remainingEvents = previousEvents.filter(
            (existingEvent) => existingEvent.id !== event.id,
        );
        if (remainingEvents.length > 0) {
            eventsByCalendar.set(previousCalendarId, remainingEvents);
        } else {
            eventsByCalendar.delete(previousCalendarId);
        }
    }
    upsertEventRecord(eventsByCalendar, event);
}
