export function normalizeBoardFocus(
    input: unknown,
): "agenda" | "classroom" | "chat" {
    const value = String(input ?? "")
        .trim()
        .toLowerCase();
    if (value === "classroom") return "classroom";
    if (value === "chat") return "chat";
    return "agenda";
}
