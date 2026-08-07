export const DEFAULT_CALENDAR_COLOR = "#1f8ceb";
export const CALENDAR_COLOR_PATTERN = /^#([0-9a-fA-F]{6})$/;
export const CALENDAR_COLOR_PALETTE = [
    "#1f8ceb",
    "#7c3aed",
    "#c026d3",
    "#db2777",
    "#dc2626",
    "#ea580c",
    "#ca8a04",
    "#16a34a",
    "#0d9488",
    "#0891b2",
    "#4f46e5",
];

export function randomCalendarColor(randomValue = Math.random()) {
    const paletteIndex = Math.floor(
        randomValue * CALENDAR_COLOR_PALETTE.length,
    );
    return CALENDAR_COLOR_PALETTE[
        Math.max(0, Math.min(paletteIndex, CALENDAR_COLOR_PALETTE.length - 1))
    ];
}

export function normalizeCalendarColor(value) {
    const candidate = String(value ?? "").trim();
    return CALENDAR_COLOR_PATTERN.test(candidate)
        ? candidate.toLowerCase()
        : DEFAULT_CALENDAR_COLOR;
}
