export function buildParticipantEntryKey(entry) {
    return JSON.stringify([entry.type, entry.value]);
}

export function buildConflictCreateKey(values) {
    return JSON.stringify([
        String(values.calendarId ?? "").trim(),
        String(values.startAt ?? "").trim(),
        String(values.endAt ?? "").trim(),
    ]);
}

export function resolveReminderOffsetsForCalendar(
    reminderOffsetsMinutes,
    calendars,
    calendarId,
) {
    if (reminderOffsetsMinutes.length > 0) {
        return reminderOffsetsMinutes;
    }
    const selectedCalendar = calendars.find(
        (calendar) => calendar.id === calendarId,
    );
    return Array.isArray(selectedCalendar?.defaultReminderOffsetsMinutes)
        ? selectedCalendar.defaultReminderOffsetsMinutes
        : [];
}
