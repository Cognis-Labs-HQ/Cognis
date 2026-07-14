import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { registerShareRenderer } from "/static/gateways/share/ui/app/renderer-registry.js";

registerShareRenderer("meeting", ({ data, i18n }) => {
    const title = String(data?.title ?? i18n.t("ui.reuse.meeting")).trim();
    const hostDisplayName = String(data?.hostDisplayName ?? "").trim();
    const joinUrl = String(data?.joinUrl ?? "").trim();
    const scheduledAt = String(data?.scheduledAt ?? "").trim();
    const scheduledLabel = scheduledAt
        ? formatDateTime(scheduledAt)
        : i18n.t("ui.reuse.available_now");
    return `
        <article class="share-meeting-card">
            <h2>${escapeHtml(title || i18n.t("ui.reuse.meeting"))}</h2>
            <div class="share-meeting-meta">
                <p>${escapeHtml(i18n.t("ui.reuse.host"))}: ${escapeHtml(hostDisplayName || i18n.t("ui.reuse.system"))}</p>
                <p>${escapeHtml(i18n.t("ui.reuse.scheduled_at"))}: ${escapeHtml(scheduledLabel)}</p>
            </div>
            <div class="share-meeting-actions">
                ${joinUrl ? `<a class="btn-confirm btn-animated" href="${escapeHtml(joinUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(i18n.t("ui.reuse.join"))}</a>` : ""}
            </div>
        </article>
    `;
});
