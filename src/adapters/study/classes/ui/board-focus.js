export function normalizeBoardFocus(input) {
    const normalized = String(input ?? "")
        .trim()
        .toLowerCase();
    if (normalized === "classroom") return "classroom";
    if (normalized === "chat") return "chat";
    return "agenda";
}
