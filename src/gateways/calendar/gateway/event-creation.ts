import type { AddEventInput, AddEventToCalendarInput } from "./inputs.js";
import {
    enforceOwnerAttendance,
    resolveReminderOffsets,
    type CalendarRecord,
    type CalendarEventRecord,
} from "./utils.js";
import { createEventSeries } from "./event-series.js";

export function ownedEventInput(
    input: AddEventInput,
    calendar: CalendarRecord,
): AddEventToCalendarInput {
    return {
        ...input,
        calendarId: calendar.id,
        createdBy: input.ownerAccountId,
        attendees: enforceOwnerAttendance(
            input.ownerAccountId,
            input.attendees,
        ),
        reminderOffsetsMinutes: resolveReminderOffsets(
            input.reminderOffsetsMinutes,
            calendar.defaultReminderOffsetsMinutes,
        ),
    };
}

const creationFields = [
    "calendarId",
    "createdBy",
    "title",
    "description",
    "startAt",
    "endAt",
    "status",
    "recurrence",
    "attendees",
    "inviteEmails",
    "reminderOffsetsMinutes",
    "meetingUrl",
] as const;

/** A replay retains the first event identity and cannot create another recurrence series. */
export function createEventsOnce(
    input: AddEventToCalendarInput,
    storage: {
        exists(id: string): boolean;
        lookup(id: string): CalendarEventRecord | undefined;
        insert(event: CalendarEventRecord): void;
    },
): CalendarEventRecord {
    if (!storage.exists(input.calendarId))
        throw new Error("calendar_not_found");
    const events = createEventSeries(input);
    const previous = input.operationId
        ? storage.lookup(input.operationId)
        : undefined;
    if (previous) {
        if (
            creationFields.some(
                (field) =>
                    JSON.stringify(previous[field]) !==
                    JSON.stringify(events[0][field]),
            )
        )
            throw new Error("calendar_operation_conflict");
        return previous;
    }
    for (const event of events) storage.insert(event);
    return events[0];
}
