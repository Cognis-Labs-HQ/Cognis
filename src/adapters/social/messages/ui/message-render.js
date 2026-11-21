import { renderConversationMarkup } from "./reuse/conversation-presentation.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { messagesFetch as apiFetch } from "./offline-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import { resolveMemberDisplayName } from "/static/reuse/member-display-name.js";
import { createAnchoredPopup, openPopup } from "/static/reuse/popup.js";
import { formatDate, formatTime } from "/static/reuse/timestamp.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";
import {
    decryptMessageOrReturnPlaintext,
    emojiDisplayName,
    normalizeReactionEmoji,
    resolveMessageStyle,
    stableJson,
} from "./message-utils.js";
import { messageRenderSignature } from "./room-render.js";
import { formatRoomEvent } from "./flows.js";
import { renderReactionRows } from "./thread-reactions.js";
import { createThreadView } from "./thread-dom.js";
import {
    mergeThreadPage,
    messageRefreshCursor,
    confirmThreadRead,
} from "./thread-data.js";

const profileAvatars = () => {
    const capability = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    if (!capability) throw new Error("Profile avatar capability unavailable");
    return capability;
};
const buildProfileAvatarMarkup = (options) =>
    profileAvatars().buildMarkup(options);
const hydrateProfileAvatars = (container) =>
    profileAvatars().hydrate(container);

const reactionHoverPopup = createAnchoredPopup({
    className: "messages-reaction-hover-popup",
});
const readReceiptHoverPopup = createAnchoredPopup({
    className: "messages-read-receipt-popup",
});

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

function isOpaqueRoomLabel(label) {
    return /^[a-f0-9-]{20,}$/i.test(String(label ?? ""));
}

function messageSearchContext(roomLabel, sender) {
    const normalizedRoomLabel = String(roomLabel ?? "").trim();
    if (!normalizedRoomLabel || normalizedRoomLabel === sender) return "";
    return isOpaqueRoomLabel(normalizedRoomLabel) ? "" : normalizedRoomLabel;
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
            records.map(async (messageRecord) => {
                const resolved = {
                    ...messageRecord,
                    text: roomKey
                        ? await decryptMessageOrReturnPlaintext(
                              roomKey,
                              messageRecord,
                          )
                        : messageRecord.text || messageRecord.content || "",
                };
                return {
                    ...resolved,
                    roomEventLabel: await formatRoomEventText(
                        resolved,
                        searchI18n,
                    ),
                };
            }),
        );
        searchableRoomMessages.set(roomId, records);
    }
    return records
        .filter(
            (messageRecord) =>
                !messageRecord.roomEventLabel &&
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
                description: [
                    messageSearchContext(roomLabel, sender),
                    timeLabel,
                ]
                    .filter(Boolean)
                    .join(" — "),
                url: `/messages/${encodeURIComponent(roomId)}#message-${encodeURIComponent(messageRecord.id)}`,
                resultClass: "message",
                searchText: [
                    messageSearchContext(roomLabel, sender),
                    sender,
                    messageRecord.senderHandle,
                    messageRecord.text,
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

async function formatRoomEventText(message, i18n) {
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
    return formatRoomEvent(payload, subjectLabel, i18n);
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
            const readTime = formatTime(reader.readAt, "");
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
                    const reactedTime = formatTime(reactedAt, "");
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
        showAvailability: false,
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

function unchangedThreadResult(view) {
    return {
        oldestCreatedAt: view.oldestCreatedAt,
        newestCreatedAt: view.newestCreatedAt,
        pendingRequest: view.pendingRequest,
        changed: false,
    };
}

export async function renderThread(
    roomId,
    key,
    container,
    i18n,
    currentAccountId,
    before,
    options = {},
) {
    if (options.isCurrent && !options.isCurrent()) return { obsolete: true };
    const style = resolveMessageStyle();
    const view = createThreadView(container, {
        roomId,
        accountId: currentAccountId,
        key,
        style,
    });
    const isCurrent = () => (options.isCurrent?.() ?? true) && view.isCurrent();
    try {
        return await renderThreadSnapshot(
            roomId,
            key,
            container,
            i18n,
            currentAccountId,
            before,
            { ...options, isCurrent, style, view, requestOrder: view.order },
        );
    } finally {
        view.finish();
    }
}

async function renderThreadSnapshot(
    roomId,
    key,
    container,
    i18n,
    currentAccountId,
    before,
    {
        force = false,
        isCurrent,
        signal,
        refreshMessageId,
        style,
        view,
        requestOrder,
    },
) {
    if (!isCurrent()) return { obsolete: true };
    const refreshBefore = messageRefreshCursor(view.read(), refreshMessageId);
    const pageBefore = before || refreshBefore;
    const params = new URLSearchParams({ limit: "50" });
    if (pageBefore) params.set("before", pageBefore);
    let pendingRequest;
    let renderSignature;
    let decoded;
    let live;
    try {
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages?${params}`,
            { signal },
        );
        if (!isCurrent()) return { obsolete: true };
        if (!response.ok) {
            const current = view.read();
            if (current?.publicationOrder > requestOrder)
                return unchangedThreadResult(current);
            if (!pageBefore && !refreshMessageId) view.clear();
            return null;
        }
        const source = response.headers?.get("x-cognis-read-source") || "live";
        live = source === "live";
        const payload = await response.json();
        if (!isCurrent()) return { obsolete: true };
        const messageList = payload?.data ?? [];
        pendingRequest = payload?.pendingRequest ?? null;
        renderSignature =
            source + ":" + messageRenderSignature(messageList, pendingRequest);
        if (
            !pageBefore &&
            !force &&
            view.read()?.signature === renderSignature
        ) {
            confirmThreadRead(view.read(), messageList, requestOrder, live);
            return unchangedThreadResult(view.read());
        }
        const ordered = messageList
            .slice()
            .sort((left, right) =>
                String(left.createdAt).localeCompare(String(right.createdAt)),
            );
        decoded = await Promise.all(
            ordered.map(async (messageRecord) => {
                const text = key
                    ? await decryptMessageOrReturnPlaintext(key, messageRecord)
                    : null;
                const resolved = {
                    ...messageRecord,
                    text,
                    pageBefore,
                    renderOrder: live ? requestOrder : 0,
                    readOrder: live ? requestOrder : 0,
                };
                return {
                    ...resolved,
                    roomEventLabel: await formatRoomEventText(resolved, i18n),
                };
            }),
        );
    } catch (error) {
        if (!isCurrent()) return { obsolete: true };
        const current = view.read();
        if (current?.publicationOrder > requestOrder)
            return unchangedThreadResult(current);
        throw error;
    }
    if (!isCurrent()) return { obsolete: true };
    const previous = view.read();
    // Latest refreshes replace a snapshot; only explicit history requests merge
    // pages. A newer latest publication makes this entire latest result stale.
    if (!pageBefore && previous?.latestRequestOrder > requestOrder) {
        return unchangedThreadResult(previous);
    }
    const page = mergeThreadPage(previous, decoded, {
        before: pageBefore,
        refreshOnly: Boolean(refreshBefore),
        requestOrder,
        live,
    });
    const queuedChanged =
        messageRenderSignature(
            previous?.messages.filter((message) => message.queued) ?? [],
            null,
        ) !==
        messageRenderSignature(
            page.messages.filter((message) => message.queued),
            null,
        );
    decoded = page.messages;
    searchableRoomMessages.set(roomId, decoded);
    const readersAtMessage = buildLastReadMap(decoded);
    const html = renderConversationMarkup(
        { records: decoded, style, currentAccountId },
        {
            buildAvatar: buildProfileAvatarMarkup,
            decorateMessage: (messageRecord, isOwn) => {
                const readers = Array.isArray(messageRecord.readBy)
                    ? messageRecord.readBy
                    : [];
                const readersHere = isOwn
                    ? (readersAtMessage.get(messageRecord.id) ?? []).filter(
                          (reader) => reader.accountId !== currentAccountId,
                      )
                    : [];
                return {
                    statusBlock: renderMessageStatus(
                        messageRecord,
                        currentAccountId,
                        Number(messageRecord.deliveredToCount ?? 0) > 0 ||
                            readers.length > 0,
                        readersHere,
                        readers.length > 0,
                        i18n,
                    ),
                    ...renderReactionRows(messageRecord, i18n, isOwn),
                };
            },
        },
    );

    const { oldestCreatedAt, newestCreatedAt, hasMore } = page;
    const earlierButton =
        hasMore && oldestCreatedAt
            ? `<button type="button" class="messages-load-earlier-btn" data-before-time="${escapeHtml(oldestCreatedAt)}">${escapeHtml(i18n.t("module.social.messages.load_earlier"))}</button>`
            : "";
    hideAllMessageHoverPopups();
    pendingRequest =
        previous && (pageBefore || !live)
            ? previous.pendingRequest
            : pendingRequest;
    view.publish(earlierButton + html, {
        ...page,
        pendingRequest,
        prepend: Boolean(before),
        signature:
            page.remoteAdjusted ||
            page.queuedProjectionOrder !== requestOrder ||
            (pageBefore && (queuedChanged || !live))
                ? null
                : pageBefore
                  ? previous?.signature
                  : renderSignature,
    });
    void hydrateProfileAvatars(container);
    return { oldestCreatedAt, newestCreatedAt, pendingRequest, changed: true };
}

export async function loadRooms(i18n, { getRoomKey, isCurrent = () => true }) {
    const response = await apiFetch("/api/v1/social/messages/rooms");
    if (!response.ok) return [];
    const payload = await response.json();
    const rooms = payload?.data ?? [];
    const decodedRooms = await Promise.all(
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
    if (!isCurrent()) return [];
    searchRoomKeyResolver = getRoomKey;
    searchI18n = i18n;
    searchableRooms = rooms;
    return decodedRooms;
}
