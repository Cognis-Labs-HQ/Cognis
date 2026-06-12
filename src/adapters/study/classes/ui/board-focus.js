export function normalizeBoardFocus(input) {
    const normalized = String(input ?? "")
        .trim()
        .toLowerCase();
    if (normalized === "classroom") return "classroom";
    if (normalized === "chat") return "chat";
    if (normalized === "whiteboard") return "whiteboard";
    if (normalized === "notepad") return "notepad";
    return "agenda";
}
