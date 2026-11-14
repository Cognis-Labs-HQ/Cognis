import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import { formatDate, formatTime } from "/static/reuse/timestamp.js";

function renderMessageBodyMarkup(messageText) {
    const normalizedText = String(messageText ?? "…");
    return `<div class="messages-message-body">${renderMarkdown(normalizedText, { softBreaks: true })}</div>`;
}

export function renderConversationMarkup(
    { records, style, currentAccountId },
    { buildAvatar, decorateMessage, interactive = true },
) {
    const renderAvatar = (message, bubble) => {
        const avatarClass = bubble
            ? "messages-message-bubble-avatar"
            : "messages-message-avatar";
        const label =
            message.senderDisplayName ||
            message.senderHandle ||
            message.senderId;
        return buildAvatar({
            avatarKey: interactive ? message.senderAvatarKey || null : null,
            label,
            colorSeed: message.senderHandle || message.senderId || label,
            avatarClass,
            imageClass: `${avatarClass}-img`,
            fallbackClass: `${avatarClass}-fallback`,
            profileHandle: interactive ? message.senderHandle || null : null,
            linkClass: "messages-avatar-link",
            showAvailability: false,
        });
    };
    let previousDateLabel = "";
    const isSpeechBubbles = style === "speech_bubbles";
    return records
        .map((messageRecord) => {
            const dateLabel = formatDate(messageRecord.createdAt, "");
            const showDateDivider =
                dateLabel && dateLabel !== previousDateLabel
                    ? `<div class="messages-date-divider" data-thread-key="date-${escapeHtml(dateLabel)}"><span>${escapeHtml(dateLabel)}</span></div>`
                    : "";
            if (dateLabel) {
                previousDateLabel = dateLabel;
            }
            const roomEventLabel = messageRecord.roomEventLabel;
            if (roomEventLabel) {
                return `${showDateDivider}<div class="messages-room-event" data-thread-key="event-${escapeHtml(messageRecord.id)}">${escapeHtml(roomEventLabel)}</div>`;
            }
            const isOwn = messageRecord.senderId === currentAccountId;
            const ownClass = isOwn ? " messages-message--own" : "";
            const timeLabel = messageRecord.createdAt
                ? `<time class="messages-message-time" datetime="${escapeHtml(messageRecord.createdAt)}">${escapeHtml(formatTime(messageRecord.createdAt, ""))}</time>`
                : "";
            const {
                statusBlock = "",
                pickerRow = "",
                activeRow = "",
            } = decorateMessage?.(messageRecord, isOwn) ?? {};
            const ownRowClass = isOwn ? " messages-message-row--own" : "";
            const displayName =
                messageRecord.senderDisplayName ||
                messageRecord.senderHandle ||
                messageRecord.senderId;
            const handle = messageRecord.senderHandle || "";
            const senderDisplaySpan = `<span class="messages-message-sender">${escapeHtml(displayName)}</span>`;
            const senderHandleSpan = handle
                ? `<span class="messages-message-handle">${escapeHtml(`@${handle}`)}</span>`
                : "";
            const senderLabel = isOwn
                ? senderHandleSpan
                : `${senderDisplaySpan}${senderHandleSpan}`;
            const bubbleAvatarMarkup = renderAvatar(messageRecord, true);
            const messageSearchText = [displayName, handle, messageRecord.text]
                .filter(Boolean)
                .join(" ");
            const metadataRow =
                timeLabel || statusBlock
                    ? `<span class="messages-message-meta">${timeLabel}${statusBlock}</span>`
                    : "";
            const innerMetaRow = isSpeechBubbles ? "" : metadataRow;
            const outerMetaRow = isSpeechBubbles ? metadataRow : "";
            return `${showDateDivider}<div class="messages-message-row${ownRowClass}"${interactive ? ` id="message-${escapeHtml(encodeURIComponent(messageRecord.id))}" data-message-id="${escapeHtml(messageRecord.id)}" data-thread-key="message-${escapeHtml(messageRecord.id)}" data-search-label="${escapeHtml(displayName)}" data-search-description="${escapeHtml(formatDate(messageRecord.createdAt, ""))}" data-search-text="${escapeHtml([messageSearchText, formatDate(messageRecord.createdAt, "")].filter(Boolean).join(" "))}"` : ""}>
        ${isOwn ? "" : renderAvatar(messageRecord, false)}
        <div class="messages-message-wrap">
          ${bubbleAvatarMarkup}
          ${interactive ? `<span data-reaction-slot="picker" data-search-exclude="true">${pickerRow}</span>` : ""}
          <div class="messages-message${ownClass}">
            ${senderLabel}
            <div class="messages-message-content">
              ${renderMessageBodyMarkup(messageRecord.text)}
              ${innerMetaRow}
            </div>
          </div>
          ${outerMetaRow}
          ${interactive ? `<span data-reaction-slot="active" data-search-exclude="true">${activeRow}</span>` : ""}
        </div>
      </div>`;
        })
        .join("");
}
