export const DEFAULT_CALENDAR_COLOR = "#1f8ceb";
export const CALENDAR_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

export function normalizeCalendarColor(value) {
    const candidate = String(value ?? "").trim();
    return CALENDAR_COLOR_PATTERN.test(candidate)
        ? candidate.toLowerCase()
        : DEFAULT_CALENDAR_COLOR;
}
