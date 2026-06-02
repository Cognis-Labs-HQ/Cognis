import type { CalendarEventRecord, CalendarRecord } from "./utils.js";

export function getEventsByRecurrenceId(
    eventsByCalendar: Map<string, CalendarEventRecord[]>,
    recurrenceId: string,
): CalendarEventRecord[] {
    return Array.from(eventsByCalendar.values())
        .flatMap((events) => events)
        .filter(
            (event) =>
                event.recurrenceId === recurrenceId &&
                event.sourceEventId === null,
        )
        .sort((leftEvent, rightEvent) =>
            leftEvent.startAt.localeCompare(rightEvent.startAt),
        );
}

export function listOwnedEventsByRecurrenceId(
    eventsByCalendar: Map<string, CalendarEventRecord[]>,
    getCalendar: (calendarId: string) => CalendarRecord | null,
    ownerAccountId: string,
    recurrenceId: string,
): CalendarEventRecord[] {
    return Array.from(eventsByCalendar.values())
        .flatMap((events) => events)
        .filter((event) => {
            if (event.recurrenceId !== recurrenceId) return false;
            const calendar = getCalendar(event.calendarId);
            return calendar?.ownerAccountId === ownerAccountId;
        })
        .sort((leftEvent, rightEvent) =>
            leftEvent.startAt.localeCompare(rightEvent.startAt),
        );
}

export function listEventsByRecurrenceIdIncludingMirrors(
    eventsByCalendar: Map<string, CalendarEventRecord[]>,
    recurrenceId: string,
): CalendarEventRecord[] {
    return Array.from(eventsByCalendar.values())
        .flatMap((events) => events)
        .filter((event) => event.recurrenceId === recurrenceId)
        .sort((leftEvent, rightEvent) =>
            leftEvent.startAt.localeCompare(rightEvent.startAt),
        );
}

export function getResponseRootEventId(event: CalendarEventRecord): string {
    return event.sourceEventId ?? event.id;
}
