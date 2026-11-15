import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatDate, formatTime } from "/static/reuse/timestamp.js";

export function receiptHeading(readers, i18n) {
    return i18n
        .t("module.social.messages.receipt_seen_by_count")
        .replace("{count}", String(readers.length));
}

function renderReaderAvatar(reader, renderer, size, className) {
    const profile = {
        displayName:
            reader.displayName ||
            (!reader.handle ? reader.accountId || "" : ""),
        handle: reader.handle || "",
    };
    const { label } = renderer.getPresentation(profile);
    const content = renderer.buildContent({
        profile,
        size,
        avatarKey: reader.avatarKey || "",
    });
    const circle = `<span class="messages-receipt-circle">${content}</span>`;
    if (!reader.handle)
        return `<span class="${className}" role="img" aria-label="${escapeHtml(label)}">${circle}</span>`;
    const href = `/profile/${encodeURIComponent(String(reader.handle).replace(/^@/, ""))}`;
    return `<a class="${className} messages-avatar-link" href="${escapeHtml(href)}" aria-label="${escapeHtml(label)}">${circle}</a>`;
}

export function requireReceiptRenderer(renderer) {
    if (
        renderer?.available !== true ||
        ["getPresentation", "buildContent", "hydrate"].some(
            (method) => typeof renderer[method] !== "function",
        ) ||
        !["tiny", "compact"].every((size) =>
            renderer.contentSizes?.includes(size),
        )
    )
        throw new Error("profile_avatar_receipt_sizes_unavailable");
    return renderer;
}

export function renderReceiptAvatars(readers, renderer) {
    requireReceiptRenderer(renderer);
    return readers
        .map((reader) =>
            renderReaderAvatar(
                reader,
                renderer,
                "tiny",
                "messages-status-avatar",
            ),
        )
        .join("");
}

export function renderReaders(readers, renderer, i18n) {
    const items = readers
        .map((reader) => {
            const label =
                reader.displayName || reader.handle || reader.accountId;
            const timestamp = [
                formatDate(reader.readAt, ""),
                formatTime(reader.readAt, ""),
            ]
                .filter(Boolean)
                .join(" ");
            return `<li class="messages-receipt-popup-reader">
                ${renderReaderAvatar(reader, renderer, "compact", "messages-receipt-popup-avatar")}
                <span class="messages-receipt-popup-reader-meta">
                    <span class="messages-receipt-popup-reader-name">${escapeHtml(label)}</span>
                    ${timestamp ? `<span class="messages-receipt-popup-reader-time">${escapeHtml(timestamp)}</span>` : ""}
                </span>
            </li>`;
        })
        .join("");
    return `<div class="messages-receipt-popup-header">
        <h3 class="messages-receipt-popup-title">${escapeHtml(receiptHeading(readers, i18n))}</h3>
        <button type="button" class="btn btn-neutral messages-receipt-close">${escapeHtml(i18n.t("ui.reuse.close"))}</button>
    </div>
    <ul class="messages-receipt-popup-list">${items}</ul>`;
}
