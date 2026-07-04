const NAMED_BOARD_FOCUSES = new Set([
    "classroom",
    "chat",
    "whiteboard",
    "notepad",
]);

export function normalizeBoardFocus(input) {
    const normalized = String(input ?? "")
        .trim()
        .toLowerCase();
    return NAMED_BOARD_FOCUSES.has(normalized) ? normalized : "agenda";
}
