/**
 * Sanitize a metadata header value by removing newlines and trimming whitespace.
 *
 * @param {string} value
 * @returns {string}
 * @example
 * sanitizeCalendarExportHeaderValue(" Team Calendar\r\n")
 */
export function sanitizeCalendarExportHeaderValue(value: string): string {
    return String(value ?? "")
        .replace(/[\r\n]+/g, " ")
        .trim();
}

/**
 * Build metadata headers for calendar export responses.
 *
 * @param {string} calendarName
 * @param {string} calendarId
 * @returns {Record<string, string>}
 * @example
 * buildCalendarExportHeaders("Team Calendar", "calendar_123")
 */
export function buildCalendarExportHeaders(
    calendarName: string,
    calendarId: string,
): Record<string, string> {
    const sanitizedCalendarName =
        sanitizeCalendarExportHeaderValue(calendarName);
    const normalizedFilename =
        sanitizedCalendarName
            .replace(/[^\p{L}\p{N}._-]+/gu, "_")
            .replace(/^_+|_+$/g, "") || "calendar";
    return {
        "content-type": "text/calendar; charset=utf-8",
        "x-cognis-calendar-name": sanitizedCalendarName,
        "x-cognis-calendar-id": sanitizeCalendarExportHeaderValue(calendarId),
        "content-disposition": `attachment; filename="${normalizedFilename}.ics"`,
        "access-control-expose-headers":
            "content-disposition,x-cognis-calendar-name,x-cognis-calendar-id",
    };
}
