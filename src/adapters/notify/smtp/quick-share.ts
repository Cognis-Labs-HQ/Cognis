export function buildMailtoShareUrl(input: {
    shareUrl: string;
    label?: string | null;
}): string {
    const shareUrl = String(input.shareUrl ?? "").trim();
    const label = String(input.label ?? "").trim();
    const subject = label ? `Cognis Share Link: ${label}` : "Cognis Share Link";
    const body = label
        ? `🔗 Here is your Cognis share link for ${label}:\n${shareUrl}\n\nCognis automated notification. Please do not reply to this message.`
        : `🔗 Here is your Cognis share link:\n${shareUrl}\n\nCognis automated notification. Please do not reply to this message.`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
