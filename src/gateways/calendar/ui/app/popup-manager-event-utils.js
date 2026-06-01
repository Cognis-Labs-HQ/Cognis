export function findOverlappingEvents(
    eventsByCalendar,
    { calendarId, startAt, endAt, excludedEventId = null },
) {
    const isAllDayEvent = (event) => {
        const start = new Date(event.startAt);
        const end = new Date(event.endAt);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return false;
        }
        if (end.getTime() <= start.getTime()) return false;
        return (
            start.getHours() === 0 &&
            start.getMinutes() === 0 &&
            start.getSeconds() === 0 &&
            start.getMilliseconds() === 0 &&
            end.getHours() === 0 &&
            end.getMinutes() === 0 &&
            end.getSeconds() === 0 &&
            end.getMilliseconds() === 0
        );
    };
    return (eventsByCalendar[calendarId] ?? []).filter((event) => {
        if (excludedEventId && event.id === excludedEventId) {
            return false;
        }
        if (isAllDayEvent(event)) {
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
