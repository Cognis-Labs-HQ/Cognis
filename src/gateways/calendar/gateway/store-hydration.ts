import type { CalendarStore } from "../store.js";
import {
    normalizeAttendeeList,
    normalizeEventRecurrence,
    normalizeEventStatus,
    normalizeInviteEmails,
    type CalendarEventRecord,
    type CalendarEventResponseRecord,
    type CalendarRecord,
} from "./utils.js";
import { setResponseRecord, upsertEventRecord } from "./event-record-ops.js";

export async function hydrateCalendarStore({
    store,
    calendarsById,
    calendarIdsByOwner,
    eventsByCalendar,
    responsesByRootEvent,
    upsertCalendar,
    refreshResponses,
}: {
    store: CalendarStore;
    calendarsById: Map<string, CalendarRecord>;
    calendarIdsByOwner: Map<string, Set<string>>;
    eventsByCalendar: Map<string, CalendarEventRecord[]>;
    responsesByRootEvent: Map<string, Map<string, CalendarEventResponseRecord>>;
    upsertCalendar: (calendar: CalendarRecord) => void;
    refreshResponses: (event: CalendarEventRecord) => void;
}): Promise<void> {
    const [calendars, events, responses] = await Promise.all([
        store.listCalendars(),
        store.listEvents(),
        store.listResponses(),
    ]);
    calendarsById.clear();
    calendarIdsByOwner.clear();
    eventsByCalendar.clear();
    responsesByRootEvent.clear();
    for (const calendar of calendars) upsertCalendar(calendar);
    for (const event of events) {
        upsertEventRecord(eventsByCalendar, {
            ...event,
            attendees: normalizeAttendeeList(event.attendees),
            inviteEmails: normalizeInviteEmails(event.inviteEmails),
            status: normalizeEventStatus(event.status),
            recurrence: normalizeEventRecurrence(event.recurrence),
            responses: {},
        });
    }
    for (const response of responses)
        setResponseRecord(responsesByRootEvent, response);
    for (const eventsForCalendar of eventsByCalendar.values())
        for (const event of eventsForCalendar) refreshResponses(event);
}
