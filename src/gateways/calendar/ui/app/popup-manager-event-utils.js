export function findOverlappingEvents(
    eventsByCalendar,
    { calendarId, startAt, endAt, excludedEventId = null },
) {
    return (eventsByCalendar[calendarId] ?? []).filter((event) => {
        if (excludedEventId && event.id === excludedEventId) {
            return false;
        }
        const existingStart = new Date(event.startAt).getTime();
        const existingEnd = new Date(event.endAt).getTime();
        const nextStart = new Date(startAt).getTime();
        const nextEnd = new Date(endAt).getTime();
        return existingStart < nextEnd && existingEnd > nextStart;
    });
}

export function isSafeHttpUrl(value) {
    try {
        const parsed = new URL(String(value ?? ""));
        return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
        return false;
    }
}
