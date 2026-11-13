export const DEFAULT_CALENDAR_COLOR = "#1f8ceb";
export const CALENDAR_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;

export function randomCalendarColor(
    randomBytes = globalThis.crypto.getRandomValues(new Uint8Array(3)),
) {
    return `#${Array.from(randomBytes, (byte) =>
        byte.toString(16).padStart(2, "0"),
    ).join("")}`;
}

export function normalizeCalendarColor(value) {
    const candidate = String(value ?? "").trim();
    return CALENDAR_COLOR_PATTERN.test(candidate)
        ? candidate.toLowerCase()
        : DEFAULT_CALENDAR_COLOR;
}
