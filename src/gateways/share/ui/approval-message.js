export function formatApprovalMessage(template, approval, defaults = {}) {
    return String(template ?? "")
        .replace("%requester%", approval?.requesterDisplayName || "")
        .replace("%action%", approval?.action || defaults.action || "")
        .replace("%target%", approval?.target || defaults.target || "");
}
