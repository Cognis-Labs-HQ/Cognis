import {
    buildProfileAvatarMarkup,
    hydrateProfileAvatars,
} from "/static/gateways/social/reuse/profile-avatar.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import { resolveMemberDisplayName } from "/static/reuse/member-display-name.js";
import { createAnchoredPopup, openPopup } from "/static/reuse/popup.js";
import { formatDate, formatTime } from "/static/reuse/timestamp.js";
import { registerSearchIndex } from "/static/reuse/search-bar.js";
import { getQuickReactionEmojis } from "./emoji-helpers.js";
import {
    decryptMessageOrReturnPlaintext,
    emojiDisplayName,
    formatHandleNotation,
    normalizeReactionEmoji,
    resolveMessageStyle,
    stableJson,
} from "./message-utils.js";
import { messageRenderSignature } from "./room-render.js";

const MESSAGE_UNAVAILABLE_PLACEHOLDER = "…";
const MESSAGE_WRAP_THRESHOLD = 80;
const MAX_VISIBLE_REACTION_CHIPS = 5;

const reactionHoverPopup = createAnchoredPopup({
    className: "messages-reaction-hover-popup",
});
const readReceiptHoverPopup = createAnchoredPopup({
    className: "messages-read-receipt-popup",
});
const threadRenderSignatures = new Map();

let searchableRooms = [];
let searchRoomKeyResolver = null;
let searchI18n = null;
const searchableRoomMessages = new Map();
const MESSAGE_SEARCH_PAGE_SIZE = 100;

function roomSearchLabel(room) {
    return (
        room.displayName ||
        room.name ||
        room.title ||
        room.participantDisplayName ||
        room.participantHandle ||
        room.id
    );
}

async function collectRoomMessageSearchItems(room) {
    const roomId = String(room?.id ?? "").trim();
    if (!roomId) return [];
    const roomLabel = roomSearchLabel(room);
    let records = searchableRoomMessages.get(roomId) ?? [];
    if (!records.length) {
        let before = "";
        while (true) {
            const params = new URLSearchParams({
                limit: String(MESSAGE_SEARCH_PAGE_SIZE),
            });
            if (before) params.set("before", before);
            const response = await apiFetch(
                `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages?${params}`,
            );
            if (!response.ok) return [];
            const payload = await response.json();
            const pageRecords = Array.isArray(payload?.data)
                ? payload.data
                : [];
            records.push(...pageRecords);
            if (pageRecords.length < MESSAGE_SEARCH_PAGE_SIZE) break;
            before = String(pageRecords.at(-1)?.createdAt ?? "");
            if (!before) break;
        }
        const roomKey = searchRoomKeyResolver
            ? await searchRoomKeyResolver(roomId)
            : null;
        records = await Promise.all(
            records.map(async (messageRecord) => ({
                ...messageRecord,
                text: roomKey
                    ? await decryptMessageOrReturnPlaintext(
                          roomKey,
                          messageRecord,
                      )
                    : messageRecord.text || messageRecord.content || "",
            })),
        );
        searchableRoomMessages.set(roomId, records);
    }
    return records
        .filter(
            (messageRecord) =>
                !formatRoomEventText(messageRecord, searchI18n) &&
                String(messageRecord.text ?? "").trim(),
        )
        .map((messageRecord) => {
            const sender =
                messageRecord.senderDisplayName ||
                messageRecord.senderHandle ||
                messageRecord.senderId ||
                roomLabel;
            const timeLabel = formatDate(messageRecord.createdAt, "");
            return {
                id: `message:${messageRecord.id}`,
                label: sender,
                description: [roomLabel, timeLabel].filter(Boolean).join(" — "),
                url: `/messages/${encodeURIComponent(roomId)}#message-${encodeURIComponent(messageRecord.id)}`,
                resultClass: "message",
                searchText: [
                    roomLabel,
                    sender,
                    messageRecord.senderHandle,
                    messageRecord.text,
                    timeLabel,
                ]
                    .filter(Boolean)
                    .join(" "),
                visible: true,
            };
        });
}

async function collectMessageSearchGroups() {
    const items = (
        await Promise.all(
            (searchableRooms ?? []).map(collectRoomMessageSearchItems),
        )
    ).flat();
    return items.length ? [{ category: "Messages", items }] : [];
}

registerSearchIndex("messages", collectMessageSearchGroups);

function buildLastReadMap(decodedMessages) {
    const latestByAccount = new Map();
    for (const messageRecord of decodedMessages) {
        if (!Array.isArray(messageRecord.readBy)) continue;
        for (const reader of messageRecord.readBy) {
            if (!reader.accountId) continue;
            latestByAccount.set(reader.accountId, {
                messageId: messageRecord.id,
                reader,
            });
        }
    }
    const readersAtMessage = new Map();
    for (const [, entry] of latestByAccount) {
        const existing = readersAtMessage.get(entry.messageId) ?? [];
        existing.push(entry.reader);
        readersAtMessage.set(entry.messageId, existing);
    }
    return readersAtMessage;
}

function renderMessageStatus(
    message,
    currentAccountId,
    isDelivered,
    readersHere,
    hadPriorReaders,
    i18n,
) {
    if (message.senderId !== currentAccountId) return "";
    if (readersHere.length > 0) {
        const readerPayload = escapeHtml(
            encodeURIComponent(
                stableJson(
                    readersHere.map((reader) => ({
                        accountId: reader.accountId,
                        handle: reader.handle || null,
                        displayName: reader.displayName || null,
                        avatarKey: reader.avatarKey || null,
                        readAt: reader.readAt || null,
                    })),
                ),
            ),
        );
        const avatarMarkup = readersHere
            .map((reader) => {
                const label =
                    reader.displayName || reader.handle || reader.accountId;
                return buildProfileAvatarMarkup({
                    avatarKey: reader.avatarKey || null,
                    label,
                    colorSeed: reader.handle || reader.accountId || label,
                    avatarClass: "messages-status-avatar",
                    imageClass: "messages-status-avatar-img",
                    fallbackClass: "messages-status-avatar-fallback",
                });
            })
            .join("");
        return `<span class="messages-message-status messages-message-status--read" data-readers="${readerPayload}">${avatarMarkup}</span>`;
    }
    if (hadPriorReaders) {
        return "";
    }
    if (!isDelivered) {
        const titleAttr = escapeHtml(
            i18n.t("module.social.messages.receipt_sent"),
        );
        return `<span class="messages-message-status" title="${titleAttr}" aria-label="${titleAttr}"><span class="messages-status-badge messages-status-badge--sent">${statusUnknownSvgMarkup()}</span></span>`;
    }
    const titleAttr = escapeHtml(
        i18n.t("module.social.messages.receipt_delivered"),
    );
    return `<span class="messages-message-status" title="${titleAttr}" aria-label="${titleAttr}"><span class="messages-status-badge messages-status-badge--delivered">${statusSentSvgMarkup()}</span></span>`;
}

function formatRoomEventText(message, i18n) {
    if (message.contentType !== "application/vnd.cognis.room-event+json") {
        return null;
    }
    let payload = null;
    try {
        payload = JSON.parse(message.text || "{}");
    } catch {
        return null;
    }
    const subjectLabel =
        payload.subjectDisplayName ||
        payload.subjectHandle ||
        payload.subjectAccountId;
    const eventType = payload.eventType;
    if (eventType === "member_joined") {
        return i18n
            .t("module.social.messages.event_member_joined")
            .replace("{name}", subjectLabel);
    }
    if (eventType === "member_left") {
        return i18n
            .t("module.social.messages.event_member_left")
            .replace("{name}", subjectLabel);
    }
    if (eventType === "profile_display_name_changed") {
        return i18n
            .t("module.social.messages.event_display_name_changed")
            .replace("{name}", subjectLabel);
    }
    if (eventType === "profile_avatar_changed") {
        return i18n
            .t("module.social.messages.event_avatar_changed")
            .replace("{name}", subjectLabel);
    }
    return null;
}

function renderReactionRows(message, i18n, isOwn = false) {
    if (!message?.id) {
        return {
            pickerRow: "",
            activeRow: "",
        };
    }
    const reactionRows = Array.isArray(message.reactions)
        ? message.reactions
        : [];
    const mergedByEmoji = new Map();
    for (const reaction of reactionRows) {
        const normalizedEmoji = normalizeReactionEmoji(reaction.emoji);
        if (!normalizedEmoji) continue;
        const existing = mergedByEmoji.get(normalizedEmoji);
        if (existing) {
            existing.count += Number(reaction.count ?? 0);
            existing.reactedByMe = existing.reactedByMe || reaction.reactedByMe;
            const reactedByRows = Array.isArray(reaction.reactedBy)
                ? reaction.reactedBy
                : [];
            for (const reactor of reactedByRows) {
                if (
                    existing.reactedBy.some(
                        (entry) => entry.accountId === reactor.accountId,
                    )
                ) {
                    continue;
                }
                existing.reactedBy.push(reactor);
            }
            continue;
        }
        mergedByEmoji.set(normalizedEmoji, {
            emoji: normalizedEmoji,
            count: Number(reaction.count ?? 0),
            reactedByMe: Boolean(reaction.reactedByMe),
            reactedBy: Array.isArray(reaction.reactedBy)
                ? reaction.reactedBy
                : [],
        });
    }
    const hasChips = mergedByEmoji.size > 0;
    const allReactions = Array.from(mergedByEmoji.values());
    const visibleReactions =
        allReactions.length > 0
            ? allReactions.slice(0, MAX_VISIBLE_REACTION_CHIPS)
            : [];
    const hiddenReactionCount = Math.max(
        0,
        allReactions.length - visibleReactions.length,
    );
    const chips = visibleReactions
        .map((reaction) => {
            const ownClass = reaction.reactedByMe
                ? " messages-reaction-chip--active"
                : "";
            const emojiName = emojiDisplayName(reaction.emoji, i18n);
            const reactedByLabels = reaction.reactedBy
                .map((reactor) => resolveMemberDisplayName(reactor))
                .filter(Boolean);
            const reactedByPayload = stableJson(reactedByLabels);
            return `<button type="button" class="messages-reaction-chip${ownClass}" data-message-id="${escapeHtml(message.id)}" data-emoji="${escapeHtml(reaction.emoji)}" data-reaction-emoji-name="${escapeHtml(emojiName)}" data-reacted-by="${escapeHtml(reactedByPayload)}">${escapeHtml(reaction.emoji)} <span>${escapeHtml(String(reaction.count))}</span></button>`;
        })
        .join("");
    const quickEmojis = getQuickReactionEmojis(
        normalizeReactionEmoji,
        5 + mergedByEmoji.size,
    );
    const quick = Array.from(new Set(quickEmojis))
        .filter(
            (emoji) =>
                emoji && !mergedByEmoji.has(normalizeReactionEmoji(emoji)),
        )
        .slice(0, 5)
        .map(
            (emoji) =>
                `<button type="button" class="messages-reaction-add-btn" title="${escapeHtml(emojiDisplayName(emoji, i18n))}" data-message-id="${escapeHtml(message.id)}" data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>`,
        )
        .join("");
    const reactionDetailsPayload = encodeURIComponent(
        stableJson(
            allReactions.map((reaction) => ({
                emoji: reaction.emoji,
                count: Number(reaction.count ?? 0),
                reactedBy: reaction.reactedBy
                    .map((reactor) => {
                        const accountId = reactor?.accountId ?? null;
                        if (!accountId) return null;
                        const normalizedReactor = {
                            accountId,
                            handle: reactor?.handle ?? null,
                            displayName: reactor?.displayName ?? null,
                            reactedAt: reactor?.reactedAt ?? null,
                        };
                        const resolvedLabel =
                            resolveMemberDisplayName(normalizedReactor);
                        if (!resolvedLabel) return null;
                        return {
                            ...normalizedReactor,
                            label: resolvedLabel,
                        };
                    })
                    .filter(Boolean),
            })),
        ),
    );
    const detailsButtonLabel =
        i18n?.t("module.social.messages.emoji_more") ?? "···";
    const detailsButton =
        hiddenReactionCount > 0
            ? `<button type="button" class="messages-reaction-chip messages-reaction-more-btn messages-reaction-more-btn--details" data-reaction-details="1" data-reaction-details-payload="${escapeHtml(reactionDetailsPayload)}" data-message-id="${escapeHtml(message.id)}" title="${escapeHtml(detailsButtonLabel)}">+${escapeHtml(String(hiddenReactionCount))}</button>`
            : "";
    const moreLabel = i18n?.t("module.social.messages.emoji_more") ?? "···";
    const moreBtn = `<button type="button" class="messages-reaction-more-btn" title="${escapeHtml(moreLabel)}" data-message-id="${escapeHtml(message.id)}" data-reaction-more="1">···</button>`;
    const activeRowClass = hasChips
        ? "messages-reactions-row messages-reactions-row--has-active"
        : "messages-reactions-row";
    const activeClass = hasChips
        ? "messages-reactions-active messages-reactions-active--has-chips"
        : "messages-reactions-active";
    const ownClass = isOwn ? " messages-reactions-row--own" : "";
    const pickerRow = `<div class="messages-reaction-picker-row${ownClass}"><span class="messages-reactions-available">${quick}${moreBtn}</span></div>`;
    const activeRow = `<div class="${activeRowClass}${ownClass}"><span class="${activeClass}">${chips}${detailsButton}</span></div>`;
    return {
        pickerRow,
        activeRow,
    };
}

function shouldAllowTextWrapping(messageText) {
    if (typeof messageText !== "string") return false;
    if (messageText.includes("\n")) return true;
    let characterCount = 0;
    for (const unicodeCharacter of messageText) {
        characterCount += 1;
        if (characterCount > MESSAGE_WRAP_THRESHOLD) {
            return true;
        }
    }
    return false;
}

function renderMessageBodyMarkup(messageText) {
    const normalizedText = String(
        messageText ?? MESSAGE_UNAVAILABLE_PLACEHOLDER,
    );
    const wrapClass = shouldAllowTextWrapping(normalizedText)
        ? ""
        : " messages-message-body--no-wrap";
    return `<div class="messages-message-body${wrapClass}">${renderMarkdown(normalizedText, { softBreaks: true })}</div>`;
}

export function renderComposerPreviewMarkup(content, emptyMessage) {
    const normalizedText = String(content ?? "");
    if (!normalizedText.trim()) {
        return `<p class="messages-composer-preview-empty">${escapeHtml(emptyMessage)}</p>`;
    }
    return renderMarkdown(normalizedText, { softBreaks: true });
}

function statusUnknownSvgMarkup() {
    return statusBadgeSvgMarkup();
}

function statusSentSvgMarkup() {
    return statusBadgeSvgMarkup(true);
}

function statusBadgeSvgMarkup(includeDeliveredTick = false) {
    const deliveredTickMarkup = includeDeliveredTick
        ? '<path d="M5.25 8.1L7.15 10L10.75 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>'
        : "";
    return `<svg
    class="messages-status-icon"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="8" cy="8" r="5.25" stroke="currentColor" stroke-width="1.5"></circle>
    ${deliveredTickMarkup}
  </svg>`;
}

export function hideReactionHoverPopup() {
    reactionHoverPopup.hide();
}

export function showReactionHoverPopup(reactionChipButton) {
    if (!(reactionChipButton instanceof HTMLButtonElement)) return;
    const emojiName = String(
        reactionChipButton.getAttribute("data-reaction-emoji-name") ?? "",
    ).trim();
    if (!emojiName) {
        hideReactionHoverPopup();
        return;
    }
    const rawReactedBy = String(
        reactionChipButton.getAttribute("data-reacted-by") ?? "[]",
    );
    let reactedByLabels = [];
    try {
        const parsedReactedBy = JSON.parse(rawReactedBy);
        reactedByLabels = Array.isArray(parsedReactedBy)
            ? parsedReactedBy
                  .map((label) => String(label ?? "").trim())
                  .filter(Boolean)
            : [];
    } catch {
        reactedByLabels = [];
    }
    const participantsMarkup =
        reactedByLabels.length > 0
            ? `<ul class="messages-reaction-hover-popup-users">${reactedByLabels
                  .map(
                      (participantLabel) =>
                          `<li class="messages-reaction-hover-popup-user">${escapeHtml(participantLabel)}</li>`,
                  )
                  .join("")}</ul>`
            : "";
    reactionHoverPopup.show(
        reactionChipButton,
        `<h3 class="messages-reaction-hover-popup-title">${escapeHtml(emojiName)}</h3>${participantsMarkup}`,
    );
}

export function hideReadReceiptHoverPopup() {
    readReceiptHoverPopup.hide();
}

export function showReadReceiptHoverPopup(statusElement, readers, i18n) {
    if (!(statusElement instanceof HTMLElement)) return;
    if (!readers.length) {
        hideReadReceiptHoverPopup();
        return;
    }
    const heading = i18n
        .t("module.social.messages.receipt_seen_by_count")
        .replace("{count}", String(readers.length));
    const readerItems = readers
        .map((reader) => {
            const readerLabel =
                reader.displayName || reader.handle || reader.accountId;
            const readDay = formatDate(reader.readAt, "");
            const readTime = formatMessageTime(reader.readAt);
            const timeLabel = [readDay, readTime].filter(Boolean).join(" ");
            const avatarMarkup = buildProfileAvatarMarkup({
                avatarKey: reader.avatarKey || null,
                label: readerLabel,
                colorSeed: reader.handle || reader.accountId || readerLabel,
                avatarClass: "messages-receipt-popup-avatar",
                imageClass: "messages-receipt-popup-avatar-img",
                fallbackClass: "messages-receipt-popup-avatar-fallback",
            });
            return `<li class="messages-receipt-popup-reader">
        ${avatarMarkup}
        <span class="messages-receipt-popup-reader-meta">
          <span class="messages-receipt-popup-reader-name">${escapeHtml(readerLabel)}</span>
          ${timeLabel ? `<span class="messages-receipt-popup-reader-time">${escapeHtml(timeLabel)}</span>` : ""}
        </span>
      </li>`;
        })
        .join("");
    readReceiptHoverPopup.show(
        statusElement,
        `<h3 class="messages-receipt-popup-title">${escapeHtml(heading)}</h3><ul class="messages-receipt-popup-list">${readerItems}</ul>`,
    );
    void hydrateProfileAvatars(document.body);
}

export function hideAllMessageHoverPopups() {
    hideReactionHoverPopup();
    hideReadReceiptHoverPopup();
}

export function repositionReactionHoverPopup() {
    reactionHoverPopup.reposition();
}

export function destroyMessageHoverPopups() {
    reactionHoverPopup.destroy();
    readReceiptHoverPopup.destroy();
}

export function parseEncodedPayload(rawPayload) {
    const normalizedRawPayload = String(rawPayload ?? "[]");
    const parseCandidates = [normalizedRawPayload];
    try {
        parseCandidates.unshift(decodeURIComponent(normalizedRawPayload));
    } catch {
        // continue with raw payload candidate below
    }
    for (const candidate of parseCandidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            // continue to next candidate
        }
    }
    return [];
}

export async function openReactionDetailsPopup(reactionDetailsRows, i18n) {
    const rows = Array.isArray(reactionDetailsRows) ? reactionDetailsRows : [];
    if (rows.length === 0) return;
    const heading =
        i18n?.t("module.social.messages.emoji_more") ??
        i18n?.t("module.social.messages.reactions") ??
        "Reactions";
    const closeLabel =
        i18n?.t("ui.reuse.close") ?? i18n?.t("ui.reuse.cancel") ?? "Close";
    const detailRows = rows.flatMap((row) => {
        const emoji = String(row?.emoji ?? "").trim();
        const emojiLabel = emojiDisplayName(emoji, i18n);
        const reactedByRows = Array.isArray(row?.reactedBy)
            ? row.reactedBy
            : [];
        if (reactedByRows.length === 0) {
            const count = Number(row?.count ?? 0);
            return [
                `<li class="messages-reaction-details-reactor">
          <span class="messages-reaction-details-reactor-emoji" title="${escapeHtml(emojiLabel)}" aria-label="${escapeHtml(emojiLabel)}">${escapeHtml(emoji)}</span>
          <span class="messages-reaction-details-reactor-name">${escapeHtml(String(count))}</span>
        </li>`,
            ];
        }
        return reactedByRows
            .map((reactor) => {
                const label =
                    String(reactor?.label ?? "").trim() ||
                    resolveMemberDisplayName(reactor);
                if (!label) return "";
                const reactedAt = String(reactor?.reactedAt ?? "").trim();
                let reactedAtLabel = "";
                if (reactedAt) {
                    const reactedDay = formatDate(reactedAt, "");
                    const reactedTime = formatMessageTime(reactedAt);
                    reactedAtLabel = [reactedDay, reactedTime]
                        .filter(Boolean)
                        .join(" ");
                }
                const reactedAtMarkup = reactedAtLabel
                    ? `<span class="messages-reaction-details-reactor-time">${escapeHtml(reactedAtLabel)}</span>`
                    : "";
                return `<li class="messages-reaction-details-reactor">
          <span class="messages-reaction-details-reactor-emoji" title="${escapeHtml(emojiLabel)}" aria-label="${escapeHtml(emojiLabel)}">${escapeHtml(emoji)}</span>
          <span class="messages-reaction-details-reactor-name">${escapeHtml(label)}</span>
          ${reactedAtMarkup}
        </li>`;
            })
            .filter(Boolean);
    });
    const body = `<ul class="messages-reaction-details-reactor-list">${detailRows.join("")}</ul>`;
    await openPopup({
        title: heading,
        maxWidth: "360px",
        body: `<div class="messages-reaction-details-popup">${body}</div>`,
        actions: [
            {
                id: "close",
                label: closeLabel,
                variant: "cancel",
            },
        ],
    });
}

export function formatRoomListAvatar(room, displayedMember, titleSource) {
    const label = displayedMember
        ? resolveMemberDisplayName(displayedMember)
        : titleSource;
    return buildProfileAvatarMarkup({
        avatarKey: room?.avatarKey || displayedMember?.avatarKey || null,
        label,
        colorSeed:
            displayedMember?.handle ||
            displayedMember?.accountId ||
            titleSource,
        avatarClass: "messages-room-avatar",
        imageClass: "messages-room-avatar-img",
        fallbackClass: "messages-room-avatar-fallback",
        profileHandle: displayedMember?.handle || null,
        linkClass: "messages-avatar-link",
    });
}

function renderMemberSummaryItem(
    member,
    { avatarClass, imageClass, fallbackClass, statusText = "" },
) {
    const label = resolveMemberDisplayName(member);
    return `
    <li class="messages-member-summary-item">
      ${buildProfileAvatarMarkup({
          avatarKey: member.avatarKey || null,
          label,
          colorSeed: member.handle || member.accountId || label,
          avatarClass,
          imageClass,
          fallbackClass,
          profileHandle: member.handle || null,
          linkClass: "messages-avatar-link",
      })}
      <div class="messages-member-summary-meta">
        <span class="messages-member-summary-name">${escapeHtml(label)}</span>
        <span class="messages-member-summary-handle">${escapeHtml(`@${member.handle || member.username || member.accountId || ""}`)}</span>
      </div>
      ${
          statusText
              ? `<span class="messages-member-summary-status">${escapeHtml(statusText)}</span>`
              : ""
      }
    </li>
  `;
}

export function renderMemberSummaryBody({
    members,
    emptyText,
    presentStatusText = "",
}) {
    if (!Array.isArray(members) || members.length === 0) {
        return `<p class="messages-member-summary-empty">${escapeHtml(emptyText)}</p>`;
    }
    return `<ul class="messages-member-summary-list">${members
        .map((member) =>
            renderMemberSummaryItem(member, {
                avatarClass: "messages-member-summary-avatar",
                imageClass: "messages-member-summary-avatar-img",
                fallbackClass: "messages-member-summary-avatar-fallback",
                statusText: presentStatusText,
            }),
        )
        .join("")}</ul>`;
}

function formatMessageAvatar(message) {
    const senderLabel =
        message.senderDisplayName || message.senderHandle || message.senderId;
    return buildProfileAvatarMarkup({
        avatarKey: message.senderAvatarKey || null,
        label: senderLabel,
        colorSeed: message.senderHandle || message.senderId || senderLabel,
        avatarClass: "messages-message-avatar",
        imageClass: "messages-message-avatar-img",
        fallbackClass: "messages-message-avatar-fallback",
        profileHandle: message.senderHandle || null,
        linkClass: "messages-avatar-link",
    });
}

function formatMessageBubbleAvatar(message) {
    const senderLabel =
        message.senderDisplayName || message.senderHandle || message.senderId;
    return buildProfileAvatarMarkup({
        avatarKey: message.senderAvatarKey || null,
        label: senderLabel,
        colorSeed: message.senderHandle || message.senderId || senderLabel,
        avatarClass: "messages-message-bubble-avatar",
        imageClass: "messages-message-bubble-avatar-img",
        fallbackClass: "messages-message-bubble-avatar-fallback",
        profileHandle: message.senderHandle || null,
        linkClass: "messages-avatar-link",
    });
}

function formatMessageTime(iso) {
    return formatTime(iso, "");
}

export async function renderThread(
    roomId,
    key,
    container,
    i18n,
    currentAccountId,
    before,
    { force = false } = {},
) {
    const params = new URLSearchParams({ limit: "50" });
    if (before) params.set("before", before);
    const response = await apiFetch(
        `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages?${params}`,
    );
    if (!response.ok) {
        if (!before) container.innerHTML = "";
        return null;
    }
    const payload = await response.json();
    const messageList = payload?.data ?? [];
    const pendingRequest = payload?.pendingRequest ?? null;
    const renderSignature = messageRenderSignature(messageList, pendingRequest);
    if (
        !before &&
        !force &&
        threadRenderSignatures.get(roomId) === renderSignature
    ) {
        return {
            oldestCreatedAt: messageList.at(-1)?.createdAt ?? null,
            pendingRequest,
            changed: false,
        };
    }
    const ordered = messageList.slice().reverse();
    const decoded = await Promise.all(
        ordered.map(async (messageRecord) => {
            const text = key
                ? await decryptMessageOrReturnPlaintext(key, messageRecord)
                : null;
            return { ...messageRecord, text };
        }),
    );
    searchableRoomMessages.set(roomId, decoded);
    let previousDateLabel = "";
    const readersAtMessage = buildLastReadMap(decoded);
    const isSpeechBubbles = resolveMessageStyle() === "speech_bubbles";
    const html = decoded
        .map((messageRecord) => {
            const dateLabel = formatDate(messageRecord.createdAt, "");
            const showDateDivider =
                dateLabel && dateLabel !== previousDateLabel
                    ? `<div class="messages-date-divider"><span>${escapeHtml(dateLabel)}</span></div>`
                    : "";
            if (dateLabel) {
                previousDateLabel = dateLabel;
            }
            const roomEventLabel = formatRoomEventText(messageRecord, i18n);
            if (roomEventLabel) {
                return `${showDateDivider}<div class="messages-room-event">${escapeHtml(roomEventLabel)}</div>`;
            }
            const isOwn = messageRecord.senderId === currentAccountId;
            const ownClass = isOwn ? " messages-message--own" : "";
            const timeLabel = messageRecord.createdAt
                ? `<time class="messages-message-time" datetime="${escapeHtml(messageRecord.createdAt)}">${escapeHtml(formatMessageTime(messageRecord.createdAt))}</time>`
                : "";
            const readers = Array.isArray(messageRecord.readBy)
                ? messageRecord.readBy
                : [];
            const deliveredCount = Number(messageRecord.deliveredToCount ?? 0);
            const isDelivered = deliveredCount > 0 || readers.length > 0;
            const hadPriorReaders = readers.length > 0;
            const readersHere = isOwn
                ? (readersAtMessage.get(messageRecord.id) ?? []).filter(
                      (reader) => reader.accountId !== currentAccountId,
                  )
                : [];
            const statusBlock = renderMessageStatus(
                messageRecord,
                currentAccountId,
                isDelivered,
                readersHere,
                hadPriorReaders,
                i18n,
            );
            const ownRowClass = isOwn ? " messages-message-row--own" : "";
            const displayName =
                messageRecord.senderDisplayName ||
                messageRecord.senderHandle ||
                messageRecord.senderId;
            const handle = messageRecord.senderHandle || "";
            const senderDisplaySpan = `<span class="messages-message-sender">${escapeHtml(displayName)}</span>`;
            const senderHandleSpan = handle
                ? `<span class="messages-message-handle">${escapeHtml(formatHandleNotation(handle))}</span>`
                : "";
            const senderLabel = isOwn
                ? senderHandleSpan
                : `${senderDisplaySpan}${senderHandleSpan}`;
            const bubbleAvatarMarkup = formatMessageBubbleAvatar(messageRecord);
            const reactionRows = renderReactionRows(messageRecord, i18n, isOwn);
            const messageSearchText = [displayName, handle, messageRecord.text]
                .filter(Boolean)
                .join(" ");
            const metadataRow =
                timeLabel || statusBlock
                    ? `<span class="messages-message-meta">${timeLabel}${statusBlock}</span>`
                    : "";
            const innerMetaRow = isSpeechBubbles ? "" : metadataRow;
            const outerMetaRow = isSpeechBubbles ? metadataRow : "";
            return `${showDateDivider}<div id="message-${escapeHtml(encodeURIComponent(messageRecord.id))}" class="messages-message-row${ownRowClass}" data-message-id="${escapeHtml(messageRecord.id)}" data-search-label="${escapeHtml(displayName)}" data-search-description="${escapeHtml(formatDate(messageRecord.createdAt, ""))}" data-search-text="${escapeHtml([messageSearchText, formatDate(messageRecord.createdAt, "")].filter(Boolean).join(" "))}">
        ${isOwn ? "" : formatMessageAvatar(messageRecord)}
        <div class="messages-message-wrap">
          ${bubbleAvatarMarkup}
          <span data-search-exclude="true">${reactionRows.pickerRow}</span>
          <div class="messages-message${ownClass}">
            ${senderLabel}
            <div class="messages-message-content">
              ${renderMessageBodyMarkup(messageRecord.text)}
              ${innerMetaRow}
            </div>
          </div>
          ${outerMetaRow}
          <span data-search-exclude="true">${reactionRows.activeRow}</span>
        </div>
      </div>`;
        })
        .join("");

    const hasMore = messageList.length === 50;
    const oldestCreatedAt = ordered[0]?.createdAt ?? null;
    hideAllMessageHoverPopups();

    if (before) {
        const savedHeight = container.scrollHeight;
        container.querySelector(".messages-load-earlier-btn")?.remove();
        container.insertAdjacentHTML("afterbegin", html);
        container.scrollTop += container.scrollHeight - savedHeight;
    } else {
        const previousTop = container.scrollTop;
        const wasNearBottom =
            container.scrollHeight -
                container.scrollTop -
                container.clientHeight <
            40;
        container.innerHTML = html;
        if (wasNearBottom) {
            container.scrollTop = container.scrollHeight;
        } else {
            container.scrollTop = previousTop;
        }
    }
    void hydrateProfileAvatars(container);

    if (hasMore && oldestCreatedAt) {
        container.insertAdjacentHTML(
            "afterbegin",
            `<button type="button" class="messages-load-earlier-btn" data-before-time="${escapeHtml(oldestCreatedAt)}">${escapeHtml(i18n.t("module.social.messages.load_earlier"))}</button>`,
        );
    }

    if (!before) threadRenderSignatures.set(roomId, renderSignature);

    return { oldestCreatedAt, pendingRequest, changed: true };
}

export async function loadRooms(i18n, { getRoomKey }) {
    searchRoomKeyResolver = getRoomKey;
    searchI18n = i18n;
    const response = await apiFetch("/api/v1/social/messages/rooms");
    if (!response.ok) return [];
    const payload = await response.json();
    const rooms = payload?.data ?? [];
    searchableRooms = rooms;
    return Promise.all(
        rooms.map(async (room) => {
            const lastMessage = room.lastMessage ?? null;
            if (!lastMessage) return room;
            if (
                lastMessage.contentType ===
                "application/vnd.cognis.room-event+json"
            ) {
                return {
                    ...room,
                    lastMessagePreview: i18n.t(
                        "module.social.messages.preview_event",
                    ),
                };
            }
            const roomKey = await getRoomKey(room.id);
            const previewText = roomKey
                ? await decryptMessageOrReturnPlaintext(roomKey, lastMessage)
                : null;
            return {
                ...room,
                lastMessagePreview: previewText
                    ? previewText.slice(0, 90)
                    : i18n.t("module.social.messages.preview_encrypted"),
            };
        }),
    );
}
