export function formatApprovalMessage(template, approval, defaults = {}) {
    const escapeHtml = (value) =>
        String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    return String(template ?? "")
        .replace(
            "%requester%",
            escapeHtml(approval?.requesterDisplayName || ""),
        )
        .replace(
            "%action%",
            escapeHtml(approval?.action || defaults.action || ""),
        )
        .replace(
            "%target%",
            escapeHtml(approval?.target || defaults.target || ""),
        );
}
