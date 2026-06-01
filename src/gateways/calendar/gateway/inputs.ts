import type {
    CalendarEventRecurrence,
    CalendarEventStatus,
    CalendarVisibility,
} from "./utils.js";

export type CreateCalendarInput = {
    ownerAccountId: string;
    name: string;
    visibility?: CalendarVisibility;
    color?: string;
    defaultReminderOffsetsMinutes?: number[];
    isDefault?: boolean;
};

export type UpdateCalendarInput = {
    ownerAccountId: string;
    calendarId: string;
    name?: string;
    visibility?: CalendarVisibility;
    color?: string;
    defaultReminderOffsetsMinutes?: number[];
};

export type AddEventInput = {
    ownerAccountId: string;
    calendarId: string;
    title: string;
    description?: string | null;
    startAt: string;
    endAt: string;
    attendees?: string[];
    inviteEmails?: string[];
    reminderOffsetsMinutes?: number[];
    meetingUrl?: string | null;
    status?: CalendarEventStatus;
    recurrence?: CalendarEventRecurrence;
};
