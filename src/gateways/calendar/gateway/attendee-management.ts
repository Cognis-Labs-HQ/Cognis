import type { CalendarEventRecord } from "./utils.js";

export function removeDeclinedAttendee(input: {
    eventId: string;
    accountId: string;
    removeAll: boolean;
    eventsByCalendar: Map<string, CalendarEventRecord[]>;
    getResponseRootEventId: (event: CalendarEventRecord) => string;
    listEventsByRecurrenceIdIncludingMirrors: (
        eventsByCalendar: Map<string, CalendarEventRecord[]>,
        recurrenceId: string,
    ) => CalendarEventRecord[];
    syncResponsesForAttendees: (
        rootEventId: string,
        attendees: string[],
    ) => void;
    refreshEventResponses: (event: CalendarEventRecord) => void;
    scheduleStoreWrite: (task: () => Promise<void> | void) => void;
    saveEvent: (event: CalendarEventRecord) => Promise<void> | void;
}): void {
    const matchingEvent = Array.from(input.eventsByCalendar.values())
        .flatMap((events) => events)
        .find(
            (event) =>
                event.id === input.eventId ||
                event.sourceEventId === input.eventId,
        );
    if (!matchingEvent) return;
    if (matchingEvent.createdBy === input.accountId) return;
    const targetEvents: CalendarEventRecord[] =
        input.removeAll && matchingEvent.recurrenceId
            ? input.listEventsByRecurrenceIdIncludingMirrors(
                  input.eventsByCalendar,
                  matchingEvent.recurrenceId,
              )
            : [matchingEvent];
    const now = new Date().toISOString();
    for (const targetEvent of targetEvents) {
        if (!targetEvent.attendees.includes(input.accountId)) continue;
        targetEvent.attendees = targetEvent.attendees.filter(
            (attendee) => attendee !== input.accountId,
        );
        targetEvent.updatedAt = now;
        const rootEventId = input.getResponseRootEventId(targetEvent);
        input.syncResponsesForAttendees(rootEventId, targetEvent.attendees);
        input.refreshEventResponses(targetEvent);
        input.scheduleStoreWrite(() => input.saveEvent(targetEvent));
    }
}
