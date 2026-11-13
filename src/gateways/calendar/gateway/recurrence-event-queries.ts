import type { CalendarEventRecord, CalendarRecord } from "./utils.js";

/**
 * Returns only source events for a recurrence series.
 * Mirrored invite copies are excluded so organizer-side series operations do not
 * duplicate work across invited calendars. In this gateway, source events are the
 * organizer-owned records whose `sourceEventId === null`.
 */
export function getEventsByRecurrenceId(
    eventsByCalendar: Map<string, CalendarEventRecord[]>,
    recurrenceId: string,
): CalendarEventRecord[] {
    const matchingEvents = [];
    for (const events of eventsByCalendar.values()) {
        for (const event of events) {
            if (event.recurrenceId !== recurrenceId) continue;
            if (event.sourceEventId !== null) continue;
            matchingEvents.push(event);
        }
    }
    matchingEvents.sort((leftEvent, rightEvent) =>
        leftEvent.startAt.localeCompare(rightEvent.startAt),
    );
    return matchingEvents;
}

export function listOwnedEventsByRecurrenceId(
    eventsByCalendar: Map<string, CalendarEventRecord[]>,
    getCalendar: (calendarId: string) => CalendarRecord | null,
    ownerAccountId: string,
    recurrenceId: string,
): CalendarEventRecord[] {
    const matchingEvents = [];
    for (const events of eventsByCalendar.values()) {
        for (const event of events) {
            if (event.recurrenceId !== recurrenceId) continue;
            const calendar = getCalendar(event.calendarId);
            if (calendar?.ownerAccountId !== ownerAccountId) continue;
            matchingEvents.push(event);
        }
    }
    matchingEvents.sort((leftEvent, rightEvent) =>
        leftEvent.startAt.localeCompare(rightEvent.startAt),
    );
    return matchingEvents;
}

export function listEventsByRecurrenceIdIncludingMirrors(
    eventsByCalendar: Map<string, CalendarEventRecord[]>,
    recurrenceId: string,
): CalendarEventRecord[] {
    const matchingEvents = [];
    for (const events of eventsByCalendar.values()) {
        for (const event of events) {
            if (event.recurrenceId !== recurrenceId) continue;
            matchingEvents.push(event);
        }
    }
    matchingEvents.sort((leftEvent, rightEvent) =>
        leftEvent.startAt.localeCompare(rightEvent.startAt),
    );
    return matchingEvents;
}

export function getResponseRootEventId(event: CalendarEventRecord): string {
    return event.sourceEventId ?? event.id;
}
