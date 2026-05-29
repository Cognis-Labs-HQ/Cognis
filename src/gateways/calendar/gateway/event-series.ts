import { randomUUID } from "node:crypto";
import {
    getSeriesLength,
    normalizeAttendeeList,
    normalizeEventRecurrence,
    normalizeEventStatus,
    normalizeInviteEmails,
    shiftDateByRecurrence,
    type CalendarEventRecord,
    type CalendarEventRecurrence,
    type CalendarEventStatus,
} from "./utils.js";

export function createEventSeries(input: {
    calendarId: string;
    sourceEventId?: string | null;
    title: string;
    description?: string | null;
    startAt: string;
    endAt: string;
    createdBy: string;
    attendees?: string[];
    inviteEmails?: string[];
    meetingUrl?: string | null;
    status?: CalendarEventStatus;
    recurrence?: CalendarEventRecurrence;
    recurrenceId?: string | null;
    forceSingle?: boolean;
}): CalendarEventRecord[] {
    const title = String(input.title ?? "").trim();
    const startIso = new Date(input.startAt).toISOString();
    const endIso = new Date(input.endAt).toISOString();
    if (!title) {
        throw new Error("calendar_event_title_required");
    }
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
        throw new Error("calendar_invalid_range");
    }
    const normalizedAttendees = normalizeAttendeeList(input.attendees ?? []);
    const normalizedInviteEmails = normalizeInviteEmails(
        input.inviteEmails ?? [],
    );
    const normalizedMeetingUrl =
        typeof input.meetingUrl === "string" &&
        /^https?:\/\//i.test(input.meetingUrl.trim())
            ? input.meetingUrl.trim()
            : null;
    const recurrence = normalizeEventRecurrence(input.recurrence);
    const occurrenceCount =
        input.forceSingle === true ? 1 : getSeriesLength(recurrence);
    const recurrenceId =
        input.forceSingle === true
            ? (input.recurrenceId ?? null)
            : recurrence === "none"
              ? null
              : (input.recurrenceId ?? randomUUID());
    const now = new Date().toISOString();
    const events: CalendarEventRecord[] = [];

    for (
        let occurrenceIndex = 0;
        occurrenceIndex < occurrenceCount;
        occurrenceIndex += 1
    ) {
        const event: CalendarEventRecord = {
            id: randomUUID(),
            calendarId: input.calendarId,
            sourceEventId: input.sourceEventId ?? null,
            title,
            description:
                typeof input.description === "string" &&
                input.description.trim().length > 0
                    ? input.description
                    : null,
            startAt:
                occurrenceIndex === 0
                    ? startIso
                    : shiftDateByRecurrence(
                          startIso,
                          recurrence,
                          occurrenceIndex,
                      ),
            endAt:
                occurrenceIndex === 0
                    ? endIso
                    : shiftDateByRecurrence(
                          endIso,
                          recurrence,
                          occurrenceIndex,
                      ),
            createdBy: input.createdBy,
            status: normalizeEventStatus(input.status),
            recurrence,
            recurrenceId,
            attendees: [...normalizedAttendees],
            inviteEmails: [...normalizedInviteEmails],
            meetingUrl: normalizedMeetingUrl,
            responses: {},
            createdAt: now,
            updatedAt: now,
        };
        events.push(event);
    }

    return events;
}
