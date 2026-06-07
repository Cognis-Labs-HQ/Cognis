import type { CalendarEventRecord } from "./utils.js";

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
