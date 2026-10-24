import type { CalendarEventRecord, CalendarRecord } from "./index.js";

export function moveOwnedEvents(input: {
    ownerAccountId: string;
    calendarId: string;
    eventId: string;
    targetCalendarId: string;
    moveAll?: boolean;
    getOwnedEvent: (
        ownerAccountId: string,
        calendarId: string,
        eventId: string,
    ) => CalendarEventRecord | null;
    getOwnedCalendar: (
        ownerAccountId: string,
        calendarId: string,
    ) => CalendarRecord | null;
    listOwnedEventsByRecurrenceId: (
        ownerAccountId: string,
        recurrenceId: string,
    ) => CalendarEventRecord[];
    moveEventRecord: (
        previousCalendarId: string,
        event: CalendarEventRecord,
    ) => void;
    scheduleStoreWrite: (persistenceTask: () => Promise<void> | void) => void;
    saveEvent: (event: CalendarEventRecord) => Promise<void> | void;
}): CalendarEventRecord[] {
    const event = input.getOwnedEvent(
        input.ownerAccountId,
        input.calendarId,
        input.eventId,
    );
    if (!event) {
        throw new Error("calendar_event_not_found");
    }
    const targetCalendar = input.getOwnedCalendar(
        input.ownerAccountId,
        input.targetCalendarId,
    );
    if (!targetCalendar) {
        throw new Error("calendar_not_found");
    }
    const targetEvents =
        input.moveAll === true && event.recurrenceId
            ? input.listOwnedEventsByRecurrenceId(
                  input.ownerAccountId,
                  event.recurrenceId,
              )
            : [event];
    for (const targetEvent of targetEvents) {
        const previousCalendarId = targetEvent.calendarId;
        targetEvent.calendarId = targetCalendar.id;
        targetEvent.updatedAt = new Date().toISOString();
        input.moveEventRecord(previousCalendarId, targetEvent);
        input.scheduleStoreWrite(() => input.saveEvent(targetEvent));
    }
    return targetEvents;
}
