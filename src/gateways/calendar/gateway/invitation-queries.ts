import type { CalendarEventRecord, CalendarRecord } from "./utils.js";

/**
 * Returns all calendar events where the given account is an attendee with a
 * pending (unanswered) response on a calendar they do not own.
 *
 * Results are sorted soonest-first by `startAt`.
 */
export function listInvitedPendingEvents(
    accountId: string,
    calendarsById: Map<string, CalendarRecord>,
    eventsByCalendar: Map<string, CalendarEventRecord[]>,
): CalendarEventRecord[] {
    const results: CalendarEventRecord[] = [];
    for (const [calendarId, events] of eventsByCalendar.entries()) {
        const calendar = calendarsById.get(calendarId);
        if (!calendar || calendar.ownerAccountId === accountId) continue;
        for (const event of events) {
            if (event.createdBy === accountId) continue;
            if (!event.attendees.includes(accountId)) continue;
            const response = event.responses?.[accountId] ?? "pending";
            if (response !== "pending") continue;
            results.push(event);
        }
    }
    return results.sort((a, b) => a.startAt.localeCompare(b.startAt));
}
