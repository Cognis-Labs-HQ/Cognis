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
