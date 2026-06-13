export function normalizeBoardFocus(
    input: unknown,
): "agenda" | "classroom" | "chat" | "whiteboard" | "notepad" {
    const value = String(input ?? "")
        .trim()
        .toLowerCase();
    if (value === "classroom") return "classroom";
    if (value === "chat") return "chat";
    if (value === "whiteboard") return "whiteboard";
    if (value === "notepad") return "notepad";
    return "agenda";
}
