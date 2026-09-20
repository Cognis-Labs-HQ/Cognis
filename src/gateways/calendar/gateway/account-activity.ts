import type {
    CalendarEventRecord,
    CalendarEventResponseRecord,
    CalendarRecord,
} from "./utils.js";

export function removeCalendarAccountActivity(input: {
    accountId: string;
    calendarsById: Map<string, CalendarRecord>;
    calendarIdsByOwner: Map<string, Set<string>>;
    eventsByCalendar: Map<string, CalendarEventRecord[]>;
    responsesByRootEvent: Map<string, Map<string, CalendarEventResponseRecord>>;
}): void {
    const ownedCalendarIds = new Set(
        input.calendarIdsByOwner.get(input.accountId) ?? [],
    );
    input.calendarIdsByOwner.delete(input.accountId);
    for (const calendarId of ownedCalendarIds) {
        input.calendarsById.delete(calendarId);
        input.eventsByCalendar.delete(calendarId);
    }
    for (const [calendarId, events] of input.eventsByCalendar) {
        const retainedEvents = events
            .filter((event) => event.createdBy !== input.accountId)
            .map((event) => ({
                ...event,
                attendees: event.attendees.filter(
                    (attendee) => attendee !== input.accountId,
                ),
            }));
        if (retainedEvents.length > 0) {
            input.eventsByCalendar.set(calendarId, retainedEvents);
        } else {
            input.eventsByCalendar.delete(calendarId);
        }
    }
    const retainedEventIds = new Set(
        Array.from(input.eventsByCalendar.values())
            .flat()
            .flatMap((event) => [event.id, event.sourceEventId])
            .filter((eventId): eventId is string => Boolean(eventId)),
    );
    for (const [rootEventId, responses] of input.responsesByRootEvent) {
        responses.delete(input.accountId);
        if (responses.size === 0 || !retainedEventIds.has(rootEventId)) {
            input.responsesByRootEvent.delete(rootEventId);
        }
    }
}
