/**
 * Messages page.
 *
 * Layout:
 *   left  — list of rooms with last message preview and unread badge.
 *   right — selected room's message thread + composer.
 *
 * Messages are encrypted client-side with a per-room AES-GCM key fetched
 * from `GET /api/v1/messages/rooms/:id/key` and cached in memory for the
 * page's lifetime. The server holds the at-rest-wrapped form of the same
 * key. See `src/adapters/social/messages/docs/standard.en.md` for the full
 * threat model.
 */

import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { formatDate, getEffectiveTimezone } from "/static/reuse/timestamp.js";
import { normalizeMessageStyle } from "/static/reuse/message-style-options.js";
import {
    hexToBytes,
    bytesToHex,
    importRoomKey,
} from "/static/reuse/crypto-utils.js";

const TEXT_ENCODER = new TextEncoder();
const QUICK_REACTION_EMOJIS = ["👍", "❤", "😂", "🎉"];
const MESSAGE_UNAVAILABLE_PLACEHOLDER = "…";
const EMOJI_NAMES = {
    "👍": "Like",
    "❤": "Heart",
    "😂": "Haha",
    "🎉": "Celebrate",
};
const TYPING_TTL_SECONDS = 8;
const TYPING_IDLE_RESET_MS = (TYPING_TTL_SECONDS - 3) * 1000;
const TYPING_SEND_DEBOUNCE_MS = 1200;
const LIVE_REFRESH_INTERVAL_MS = 2500;
const LAST_OPENED_ROOM_KEY = "messages:last-opened-room";

function resolveMessageStyle() {
    const rootStyle = document.documentElement.dataset.messageStyle;
    if (rootStyle) return normalizeMessageStyle(rootStyle);
    try {
        const raw = localStorage.getItem("cognis_ui_preferences");
        if (!raw) return normalizeMessageStyle(null);
        const parsed = JSON.parse(raw);
        return normalizeMessageStyle(parsed?.messageStyle);
    } catch {
        return normalizeMessageStyle(null);
    }
}

/**
 * Normalizes an emoji token by trimming whitespace, removing variation
 * selector suffixes, and applying NFC normalization for stable comparisons.
 *
 * @param {string} emoji
 * @returns {string}
 */
function normalizeReactionEmoji(emoji) {
    return String(emoji ?? "")
        .trim()
        .replace(/[\uFE0E\uFE0F]/g, "")
        .normalize("NFC");
}

/**
 * Returns a readable emoji label for known reactions, falling back to the
 * emoji token itself when no mapping exists.
 *
 * @param {string} emoji
 * @returns {string}
 */
function emojiDisplayName(emoji) {
    const normalized = normalizeReactionEmoji(emoji);
    return EMOJI_NAMES[normalized] ?? emoji;
}

async function encryptMessage(key, plaintext) {
    const initVector = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: initVector },
        key,
        TEXT_ENCODER.encode(plaintext),
    );
    return {
        iv: bytesToHex(initVector),
        ciphertext: bytesToHex(new Uint8Array(ciphertext)),
    };
}

async function decryptMessageOrReturnPlaintext(key, message) {
    try {
        if (message.contentType === "application/vnd.cognis.room-event+json") {
            return message.ciphertext;
        }
        if (!message.iv) return null;
        let cipherHex = message.ciphertext;
        if (message.authTag) {
            cipherHex = `${cipherHex}${message.authTag}`;
        }
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: hexToBytes(message.iv) },
            key,
            hexToBytes(cipherHex),
        );
        return new TextDecoder().decode(decrypted);
    } catch {
        return null;
    }
}

const roomKeyCache = new Map();

async function getRoomKey(roomId) {
    if (roomKeyCache.has(roomId)) return roomKeyCache.get(roomId);
    const res = await apiFetch(
        `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/key`,
    );
    if (!res.ok) return null;
    const payload = await res.json();
    const hex = payload?.data?.key;
    if (!hex) return null;
    const key = await importRoomKey(hex);
    roomKeyCache.set(roomId, key);
    return key;
}

function memberDisplayName(member) {
    return (
        member.displayName ||
        member.username ||
        member.handle ||
        member.accountId
    );
}

function profileHref(handle) {
    if (!handle) return "";
    return `/profile/${encodeURIComponent(String(handle).replace(/^@/, ""))}`;
}

function selectedRoomTitle(room, currentAccountId) {
    if (!room) return "";
    const otherMembers = (room.members ?? []).filter(
        (member) => member.accountId !== currentAccountId,
    );
    if (room.kind === "dm") {
        return (
            otherMembers.map(memberDisplayName).join(", ") ||
            room.title ||
            room.id
        );
    }
    return (
        room.title || otherMembers.map(memberDisplayName).join(", ") || room.id
    );
}

function renderMemberCountControl(room, members, i18n) {
    const label = `${String(members.length)} ${i18n.t("module.social.messages.members")}`;
    if (room?.kind !== "group") {
        return `<span class="messages-thread-subtitle">${escapeHtml(label)}</span>`;
    }
    return `<button type="button" class="messages-thread-subtitle messages-thread-subtitle-btn" id="messages-member-summary-btn">${escapeHtml(label)}</button>`;
}

function randomSample(values, count) {
    return values
        .map((value) => ({ value, rank: Math.random() }))
        .sort((a, b) => a.rank - b.rank)
        .slice(0, count)
        .map((item) => item.value);
}

function renderMemberInitials(member) {
    const label = memberDisplayName(member);
    const color = pickInitialsColor(member.handle || member.accountId || label);
    return `<span class="messages-classroom-collage-tile" style="--initials-bg: ${escapeHtml(color)};">${escapeHtml(getInitialsText(label))}</span>`;
}

function renderRoomAvatar(room, currentAccountId) {
    if (!room) return "";
    const members = room.members ?? [];
    if (room.kind === "classroom") {
        if (room.avatarKey) {
            return `<div class="messages-thread-avatar"><img class="messages-thread-avatar-img" src="/api/v1/files/${escapeHtml(room.avatarKey)}" alt="" /></div>`;
        }
        const picked = randomSample(members, 4);
        while (picked.length < 4) picked.push({ handle: "", displayName: "" });
        return `<div class="messages-classroom-collage">${picked.map(renderMemberInitials).join("")}</div>`;
    }
    const other =
        members.find((member) => member.accountId !== currentAccountId) ??
        members[0];
    const label = other ? memberDisplayName(other) : room.title || room.id;
    return formatAvatarMarkup({
        avatarKey: room.avatarKey || other?.avatarKey || null,
        label,
        colorSeed: other?.handle || other?.accountId || label,
        avatarClass: "messages-thread-avatar",
        imageClass: "messages-thread-avatar-img",
        fallbackClass: "messages-thread-initials",
        profileHandle: other?.handle || null,
        linkClass: "messages-avatar-link",
    });
}

function renderThreadHeader(room, currentAccountId, i18n) {
    if (!room) return "";
    const members = room.members ?? [];
    const currentMember = members.find(
        (member) => member.accountId === currentAccountId,
    );
    const leaveHandle = currentMember?.handle || "";
    const canSetAvatar =
        room.kind === "classroom" &&
        ["teacher", "admin", "owner"].includes(
            localStorage.getItem("cognis_role") ?? "",
        );
    return `
        <header class="messages-thread-header" id="messages-thread-header">
            ${renderRoomAvatar(room, currentAccountId)}
            <div class="messages-thread-title-wrap">
                <h2 class="messages-thread-title">${escapeHtml(selectedRoomTitle(room, currentAccountId))}</h2>
                ${renderMemberCountControl(room, members, i18n)}
            </div>
            <div class="messages-thread-actions">
                ${canSetAvatar ? `<label class="messages-room-avatar-btn">${escapeHtml(i18n.t("module.social.messages.set_avatar"))}<input id="messages-room-avatar-input" type="file" accept="image/*" hidden /></label>` : ""}
                ${
                    leaveHandle
                        ? `<button id="messages-room-leave-btn" class="messages-room-leave-btn" type="button" data-leave-handle="${escapeHtml(leaveHandle)}" aria-label="${escapeHtml(i18n.t("module.social.messages.leave_conversation"))}" title="${escapeHtml(i18n.t("module.social.messages.leave_conversation"))}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M10 3V6H4L4 10H10L10 13L11 13L16 8L11 3L10 3Z" fill="currentColor" />
                        <path d="M0 2L1.38281e-06 14H2L2 2L0 2Z" fill="currentColor" />
                    </svg>
                </button>`
                        : ""
                }
            </div>
        </header>
    `;
}

function renderRoomList(rooms, currentAccountId, selectedRoomId, i18n) {
    if (!rooms.length) {
        return `<div class="messages-empty">${escapeHtml(i18n.t("module.social.messages.empty"))}</div>`;
    }
    const renderRoomItems = (roomItems) =>
        roomItems
            .map((room) => {
                const titleSource = selectedRoomTitle(room, currentAccountId);
                const members = Array.isArray(room.members) ? room.members : [];
                const preferredOtherMember = members.find(
                    (member) => member.accountId !== currentAccountId,
                );
                const displayedMember =
                    preferredOtherMember ?? members[0] ?? null;
                const avatar = formatRoomListAvatar(
                    displayedMember,
                    titleSource,
                );
                const previewSource =
                    room.lastMessagePreview ||
                    room.lastMessage?.senderDisplayName ||
                    room.lastMessage?.senderHandle ||
                    i18n.t("module.social.messages.preview_encrypted");
                const preview = String(previewSource)
                    .replace(/\s+/g, " ")
                    .trim();
                const isActive = room.id === selectedRoomId;
                const unreadBadge =
                    room.unread > 0 && !isActive
                        ? `<span class="messages-unread-badge">${escapeHtml(String(room.unread))}</span>`
                        : "";
                const pendingRequest = room.pendingRequest ?? null;
                const canRespondInSidebar =
                    pendingRequest &&
                    pendingRequest.direction === "incoming" &&
                    pendingRequest.canRespond &&
                    pendingRequest.id;
                const pendingClass = canRespondInSidebar
                    ? " messages-room--pending"
                    : "";
                const archivedClass = room.isArchived
                    ? " messages-room--archived"
                    : "";
                const pendingActions = canRespondInSidebar
                    ? `<span class="messages-room-request-actions" data-request-id="${escapeHtml(pendingRequest.id)}">
                    <button type="button" class="messages-room-request-approve" aria-label="${escapeHtml(i18n.t("module.social.messages.approve_request"))}">${escapeHtml(i18n.t("module.social.messages.approve_request"))}</button>
                    <button type="button" class="messages-room-request-reject" aria-label="${escapeHtml(i18n.t("module.social.messages.reject_request"))}">${escapeHtml(i18n.t("module.social.messages.reject_request"))}</button>
                </span>`
                    : "";
                const archivedHint = room.isArchived
                    ? `<span class="messages-room-archived-hint">${escapeHtml(i18n.t("module.social.messages.archived_locked"))}</span>`
                    : "";
                return `
      <li class="messages-room ${isActive ? "messages-room--active" : ""}${pendingClass}${archivedClass}"
          data-room-id="${escapeHtml(room.id)}">
        ${avatar}
        <span class="messages-room-meta">
            <span class="messages-room-title">${escapeHtml(titleSource)}</span>
            <span class="messages-room-preview">${escapeHtml(preview)}</span>
            ${archivedHint}
        </span>
        ${unreadBadge}
        ${pendingActions}
      </li>
    `;
            })
            .join("");
    const activeRooms = rooms.filter((room) => !room.isArchived);
    const archivedRooms = rooms.filter((room) => room.isArchived);
    const activeHtml = renderRoomItems(activeRooms);
    const archivedHtml = archivedRooms.length
        ? `<li class="messages-room-section-label">${escapeHtml(i18n.t("module.social.messages.archived_section"))}</li>${renderRoomItems(archivedRooms)}`
        : "";
    return `${activeHtml}${archivedHtml}`;
}

function buildLastReadMap(decodedMessages) {
    const latestByAccount = new Map();
    for (const msg of decodedMessages) {
        if (!Array.isArray(msg.readBy)) continue;
        for (const reader of msg.readBy) {
            if (!reader.accountId) continue;
            latestByAccount.set(reader.accountId, {
                messageId: msg.id,
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

function formatReadReceiptEntry(reader) {
    const readerLabel = reader.displayName || reader.handle || reader.accountId;
    const readDay = formatDate(reader.readAt, "");
    const readTime = formatMessageTime(reader.readAt);
    return `${readerLabel} ${readDay} ${readTime}`.trim();
}

function buildReadReceiptHoverText(i18n, isDelivered, readersHere) {
    if (!isDelivered) return i18n.t("module.social.messages.receipt_sent");
    if (!readersHere.length)
        return i18n.t("module.social.messages.receipt_delivered");
    if (readersHere.length === 1) {
        const readDay = formatDate(readersHere[0].readAt, "");
        const readTime = formatMessageTime(readersHere[0].readAt);
        return i18n
            .t("module.social.messages.receipt_read_single")
            .replace("{day}", readDay)
            .replace("{time}", readTime);
    }
    const heading = i18n
        .t("module.social.messages.receipt_read_by_count")
        .replace("{count}", String(readersHere.length));
    const lines = readersHere.map((reader) => formatReadReceiptEntry(reader));
    return `${heading}\n${lines.join("\n")}`;
}

function renderMessageStatus(
    message,
    currentAccountId,
    isDelivered,
    readersHere,
    i18n,
) {
    if (message.senderId !== currentAccountId) return "";
    const hoverText = buildReadReceiptHoverText(i18n, isDelivered, readersHere);
    const titleAttr = escapeHtml(hoverText);
    if (readersHere.length > 0) {
        const avatarMarkup = readersHere
            .map((reader) => {
                const label =
                    reader.displayName || reader.handle || reader.accountId;
                return formatAvatarMarkup({
                    avatarKey: reader.avatarKey || null,
                    label,
                    colorSeed: reader.handle || reader.accountId || label,
                    avatarClass: "messages-status-avatar",
                    imageClass: "messages-status-avatar-img",
                    fallbackClass: "messages-status-avatar-fallback",
                    profileHandle: reader.handle || null,
                    linkClass: "messages-avatar-link",
                });
            })
            .join("");
        return `<div class="messages-message-status" title="${titleAttr}" aria-label="${titleAttr}">${avatarMarkup}</div>`;
    }
    const circleClass = isDelivered ? " messages-status-circle--delivered" : "";
    return `<div class="messages-message-status" title="${titleAttr}" aria-label="${titleAttr}"><span class="messages-status-circle${circleClass}" aria-hidden="true"></span></div>`;
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

function renderReactionRow(message) {
    if (!message?.id) return "";
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
    const chips = Array.from(mergedByEmoji.values())
        .map((reaction) => {
            const ownClass = reaction.reactedByMe
                ? " messages-reaction-chip--active"
                : "";
            const reactedByLabel = reaction.reactedBy
                .map(
                    (reactor) =>
                        reactor.displayName ||
                        reactor.handle ||
                        reactor.accountId,
                )
                .join(", ");
            const titleLabel =
                reactedByLabel || emojiDisplayName(reaction.emoji);
            return `<button type="button" class="messages-reaction-chip${ownClass}" title="${escapeHtml(titleLabel)}" data-message-id="${escapeHtml(message.id)}" data-emoji="${escapeHtml(reaction.emoji)}">${escapeHtml(reaction.emoji)} <span>${escapeHtml(String(reaction.count))}</span></button>`;
        })
        .join("");
    const quick = Array.from(
        new Set(
            QUICK_REACTION_EMOJIS.map((emoji) => normalizeReactionEmoji(emoji)),
        ),
    )
        .filter(
            (emoji) =>
                emoji && !mergedByEmoji.has(normalizeReactionEmoji(emoji)),
        )
        .map(
            (emoji) =>
                `<button type="button" class="messages-reaction-add-btn" title="${escapeHtml(emojiDisplayName(emoji))}" data-message-id="${escapeHtml(message.id)}" data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>`,
        )
        .join("");
    return `<div class="messages-reactions-row">${chips}<span class="messages-reaction-add-wrap">${quick}</span></div>`;
}

/**
 * Builds avatar markup with image-first rendering and initials fallback.
 *
 * @param {object} options - Avatar rendering options.
 * @param {string | null} options.avatarKey - File key for avatar image.
 * @param {string} options.label - Fallback label used for initials.
 * @param {string} options.colorSeed - Value used for deterministic color pick.
 * @param {string} options.avatarClass - Wrapper class for avatar element.
 * @param {string} options.imageClass - Image class for avatar `<img>`.
 * @param {string} options.fallbackClass - Fallback initials class name.
 * @returns {string}
 */
function formatAvatarMarkup({
    avatarKey,
    label,
    colorSeed,
    avatarClass,
    imageClass,
    fallbackClass,
    profileHandle = null,
    linkClass = "",
}) {
    const avatarContent = avatarKey
        ? `<img class="${escapeHtml(imageClass)}" src="/api/v1/files/${escapeHtml(avatarKey)}" alt="" />`
        : `<span class="${escapeHtml(fallbackClass)}" style="--initials-bg: ${escapeHtml(pickInitialsColor(colorSeed || label))};">${escapeHtml(getInitialsText(label))}</span>`;
    const profileLink = profileHref(profileHandle);
    if (profileLink) {
        const classes = [avatarClass, linkClass].filter(Boolean).join(" ");
        return `<a class="${escapeHtml(classes)}" href="${escapeHtml(profileLink)}" aria-label="${escapeHtml(label)}">${avatarContent}</a>`;
    }
    if (avatarKey) {
        return `<span class="${escapeHtml(avatarClass)}"><img class="${escapeHtml(imageClass)}" src="/api/v1/files/${escapeHtml(avatarKey)}" alt="" /></span>`;
    }
    const color = pickInitialsColor(colorSeed || label);
    return `<span class="${escapeHtml(avatarClass)}"><span class="${escapeHtml(fallbackClass)}" style="--initials-bg: ${escapeHtml(color)};">${escapeHtml(getInitialsText(label))}</span></span>`;
}

function formatRoomListAvatar(displayedMember, titleSource) {
    const label = displayedMember
        ? memberDisplayName(displayedMember)
        : titleSource;
    return formatAvatarMarkup({
        avatarKey: displayedMember?.avatarKey || null,
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
    const label = memberDisplayName(member);
    return `
        <li class="messages-member-summary-item">
            ${formatAvatarMarkup({
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

function renderMemberSummaryBody({
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
    return formatAvatarMarkup({
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

function formatMessageTime(iso) {
    if (!iso) return "";
    try {
        return new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: getEffectiveTimezone(),
        }).format(new Date(iso));
    } catch {
        return "";
    }
}

async function renderThread(
    roomId,
    key,
    container,
    i18n,
    currentAccountId,
    before,
) {
    const params = new URLSearchParams({ limit: "50" });
    if (before) params.set("before", before);
    const res = await apiFetch(
        `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/messages?${params}`,
    );
    if (!res.ok) {
        if (!before) container.innerHTML = "";
        return null;
    }
    const payload = await res.json();
    const messageList = payload?.data ?? [];
    const pendingRequest = payload?.pendingRequest ?? null;
    const ordered = messageList.slice().reverse();
    const decoded = await Promise.all(
        ordered.map(async (msg) => {
            const text = key
                ? await decryptMessageOrReturnPlaintext(key, msg)
                : null;
            return { ...msg, text };
        }),
    );
    let previousDateLabel = "";
    const readersAtMessage = buildLastReadMap(decoded);
    const html = decoded
        .map((msg) => {
            const dateLabel = formatDate(msg.createdAt, "");
            const showDateDivider =
                dateLabel && dateLabel !== previousDateLabel
                    ? `<div class="messages-date-divider"><span>${escapeHtml(dateLabel)}</span></div>`
                    : "";
            if (dateLabel) {
                previousDateLabel = dateLabel;
            }
            const roomEventLabel = formatRoomEventText(msg, i18n);
            if (roomEventLabel) {
                return `${showDateDivider}<div class="messages-room-event">${escapeHtml(roomEventLabel)}</div>`;
            }
            const isOwn = msg.senderId === currentAccountId;
            const ownClass = isOwn ? " messages-message--own" : "";
            const senderLabel = isOwn
                ? ""
                : `<span class="messages-message-sender">${escapeHtml(msg.senderDisplayName || msg.senderHandle || msg.senderId)}</span>`;
            const timeLabel = msg.createdAt
                ? `<time class="messages-message-time" datetime="${escapeHtml(msg.createdAt)}">${escapeHtml(formatMessageTime(msg.createdAt))}</time>`
                : "";
            const readers = Array.isArray(msg.readBy) ? msg.readBy : [];
            const deliveredCount = Number(msg.deliveredToCount ?? 0);
            const isDelivered = deliveredCount > 0 || readers.length > 0;
            const readersHere = isOwn
                ? (readersAtMessage.get(msg.id) ?? []).filter(
                      (reader) => reader.accountId !== currentAccountId,
                  )
                : [];
            const statusBlock = renderMessageStatus(
                msg,
                currentAccountId,
                isDelivered,
                readersHere,
                i18n,
            );
            const metadataRow = timeLabel
                ? `<span class="messages-message-meta">${timeLabel}</span>`
                : "";
            const ownRowClass = isOwn ? " messages-message-row--own" : "";
            return `${showDateDivider}<div class="messages-message-row${ownRowClass}" data-message-id="${escapeHtml(msg.id)}">
            ${isOwn ? "" : formatMessageAvatar(msg)}
            <div class="messages-message${ownClass}">
                ${senderLabel}
                <span class="messages-message-content">
                    <span class="messages-message-body">${escapeHtml(msg.text ?? MESSAGE_UNAVAILABLE_PLACEHOLDER)}</span>
                    ${metadataRow}
                </span>
                ${renderReactionRow(msg)}
            </div>
            ${statusBlock}
        </div>`;
        })
        .join("");

    const hasMore = messageList.length === 50;
    const oldestCreatedAt = ordered[0]?.createdAt ?? null;

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

    if (hasMore && oldestCreatedAt) {
        container.insertAdjacentHTML(
            "afterbegin",
            `<button type="button" class="messages-load-earlier-btn" data-before-time="${escapeHtml(oldestCreatedAt)}">
                ${escapeHtml(i18n.t("module.social.messages.load_earlier"))}
            </button>`,
        );
    }

    return { oldestCreatedAt, pendingRequest };
}

async function loadRooms(i18n) {
    const res = await apiFetch("/api/v1/messages/rooms");
    if (!res.ok) return [];
    const payload = await res.json();
    const rooms = payload?.data ?? [];
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

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/adapters/social/messages/languages"],
    });
    applyDocumentTitle(i18n, "ui.reuse.messages");

    root.classList.add("messages-page");
    root.dataset.messageStyle = resolveMessageStyle();
    signal?.addEventListener(
        "abort",
        () => {
            root.classList.remove("messages-page");
            delete root.dataset.messageStyle;
        },
        { once: true },
    );

    const currentAccountId = localStorage.getItem("cognis_account") ?? "";

    const initialPath = window.location.pathname;
    const initialRoomMatch = initialPath.match(/^\/messages\/([^/]+)$/);
    const rememberedRoomId = localStorage.getItem(LAST_OPENED_ROOM_KEY);
    let selectedRoomId = initialRoomMatch
        ? decodeURIComponent(initialRoomMatch[1])
        : rememberedRoomId;
    let typingSendTimeoutId = null;
    let typingPollIntervalId = null;
    let liveRefreshIntervalId = null;
    let typingActive = false;
    let lastTypingSentAt = 0;

    let rooms = await loadRooms(i18n);
    if (signal?.aborted) return;
    if (
        selectedRoomId &&
        !rooms.some((room) => String(room.id) === String(selectedRoomId))
    ) {
        selectedRoomId = null;
    }
    if (!selectedRoomId && rooms.length > 0) {
        selectedRoomId = rooms[0].id;
        history.replaceState(
            {},
            "",
            `/messages/${encodeURIComponent(selectedRoomId)}`,
        );
    }

    async function loadRoom(roomId) {
        const res = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}`,
        );
        if (!res.ok) return null;
        return (await res.json()).data ?? null;
    }

    async function loadMeetingChatSummary(roomId) {
        const res = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/chat-room-summary",
            {
                method: "POST",
                body: JSON.stringify({ chatRoomId: roomId }),
            },
        );
        if (!res.ok) {
            return null;
        }
        return (await res.json()).data ?? null;
    }

    function renderPendingRequestBanner(pendingRequest) {
        if (!pendingRequest) return "";
        const requesterLabel =
            pendingRequest.requester?.displayName ||
            pendingRequest.requester?.handle ||
            pendingRequest.requester?.accountId ||
            "";
        if (
            pendingRequest.direction === "incoming" &&
            pendingRequest.canRespond
        ) {
            return `<div class="messages-request-banner" data-request-id="${escapeHtml(pendingRequest.id)}">
                <span class="messages-request-banner-text">${escapeHtml(i18n.t("module.social.messages.request_banner_incoming").replace("{name}", requesterLabel))}</span>
                <div class="messages-request-banner-actions">
                    <button type="button" class="messages-request-banner-approve" aria-label="${escapeHtml(i18n.t("module.social.messages.approve_request"))}">✅</button>
                    <button type="button" class="messages-request-banner-reject" aria-label="${escapeHtml(i18n.t("module.social.messages.reject_request"))}">❌</button>
                </div>
            </div>`;
        }
        if (pendingRequest.direction === "outgoing") {
            const recipientLabel =
                pendingRequest.recipient?.displayName ||
                pendingRequest.recipient?.handle ||
                pendingRequest.recipient?.accountId ||
                "";
            return `<div class="messages-request-banner">
                <span class="messages-request-banner-text">${escapeHtml(i18n.t("module.social.messages.request_banner_outgoing").replace("{name}", recipientLabel))}</span>
            </div>`;
        }
        return "";
    }

    function syncComposerAvailability(room) {
        const input = document.getElementById("messages-composer-input");
        const sendButton = document.querySelector(".messages-composer-send");
        const canSend =
            Boolean(room) &&
            room?.canSend !== false &&
            room?.isArchived !== true;
        if (input) {
            input.disabled = !canSend;
            input.placeholder = canSend
                ? i18n.t("module.social.messages.placeholder")
                : i18n.t("module.social.messages.archived_cannot_send");
        }
        if (sendButton) {
            sendButton.disabled = !canSend;
        }
    }

    async function openRoom(roomId) {
        const threadList = document.getElementById("messages-thread-list");
        const headerSlot = document.getElementById(
            "messages-thread-header-slot",
        );
        if (!threadList) return;
        localStorage.setItem(LAST_OPENED_ROOM_KEY, roomId);
        const room = await loadRoom(roomId);
        if (room) {
            rooms = rooms.map((entry) =>
                String(entry.id) === String(room.id)
                    ? { ...entry, ...room }
                    : entry,
            );
        }
        if (headerSlot && room) {
            headerSlot.innerHTML = renderThreadHeader(
                room,
                currentAccountId,
                i18n,
            );
            bindRoomHeaderEvents();
        }
        syncComposerAvailability(room);
        const pendingBannerSlot = document.getElementById(
            "messages-request-banner-slot",
        );
        if (pendingBannerSlot) {
            pendingBannerSlot.innerHTML = renderPendingRequestBanner(
                room?.pendingRequest,
            );
        }
        const key = await getRoomKey(roomId);
        const threadResult = await renderThread(
            roomId,
            key,
            threadList,
            i18n,
            currentAccountId,
        );
        if (pendingBannerSlot && !room?.pendingRequest) {
            pendingBannerSlot.innerHTML = renderPendingRequestBanner(
                threadResult?.pendingRequest ?? null,
            );
        }
        await markSelectedRoomRead();
        bindPendingRequestBannerEvents();
    }

    function renderRoomsListIntoDom() {
        const roomsList = document.getElementById("messages-rooms-list");
        if (!roomsList) return;
        roomsList.innerHTML = renderRoomList(
            rooms,
            currentAccountId,
            selectedRoomId,
            i18n,
        );
    }

    async function markSelectedRoomRead() {
        if (!selectedRoomId) return;
        await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(selectedRoomId)}/read`,
            { method: "POST" },
        ).catch(() => undefined);
        rooms = rooms.map((room) =>
            String(room.id) === String(selectedRoomId)
                ? { ...room, unread: 0 }
                : room,
        );
        renderRoomsListIntoDom();
    }

    async function respondToPendingRequest(
        requestId,
        action,
        roomIdHint = null,
    ) {
        if (!requestId || !["approve", "reject"].includes(action)) return;
        const res = await apiFetch(
            `/api/v1/messages/requests/${encodeURIComponent(requestId)}/${action}`,
            { method: "POST" },
        );
        if (!res.ok) return;
        const payload = await res.json().catch(() => null);
        await reloadRoomsList();
        if (action === "approve") {
            const nextRoomId =
                payload?.data?.id || roomIdHint || selectedRoomId;
            if (nextRoomId) {
                selectedRoomId = nextRoomId;
                history.pushState(
                    {},
                    "",
                    `/messages/${encodeURIComponent(nextRoomId)}`,
                );
                await openRoom(nextRoomId);
            }
            return;
        }
        if (roomIdHint) {
            await openRoom(roomIdHint);
            return;
        }
        if (selectedRoomId) {
            await openRoom(selectedRoomId);
        }
    }

    function bindPendingRequestBannerEvents() {
        const banner = document.querySelector(
            "#messages-request-banner-slot [data-request-id]",
        );
        if (!banner) return;
        const requestId = banner.getAttribute("data-request-id");
        if (!requestId) return;
        banner
            .querySelector(".messages-request-banner-approve")
            ?.addEventListener("click", async () => {
                await respondToPendingRequest(
                    requestId,
                    "approve",
                    selectedRoomId,
                );
            });
        banner
            .querySelector(".messages-request-banner-reject")
            ?.addEventListener("click", async () => {
                await respondToPendingRequest(
                    requestId,
                    "reject",
                    selectedRoomId,
                );
            });
    }

    async function toggleReaction(messageId, emoji) {
        if (!selectedRoomId || !messageId || !emoji) return;
        const normalizedEmoji = normalizeReactionEmoji(emoji);
        if (!normalizedEmoji) return;
        const res = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(selectedRoomId)}/messages/${encodeURIComponent(messageId)}/reactions`,
            {
                method: "POST",
                body: JSON.stringify({ emoji: normalizedEmoji }),
            },
        );
        if (!res.ok) return;
        const threadList = document.getElementById("messages-thread-list");
        if (!threadList) return;
        const key = await getRoomKey(selectedRoomId);
        await renderThread(
            selectedRoomId,
            key,
            threadList,
            i18n,
            currentAccountId,
        );
    }

    async function refreshActiveConversation() {
        if (!selectedRoomId || document.visibilityState !== "visible") return;
        await reloadRoomsList();
        const threadList = document.getElementById("messages-thread-list");
        if (!threadList) return;
        const key = await getRoomKey(selectedRoomId);
        await renderThread(
            selectedRoomId,
            key,
            threadList,
            i18n,
            currentAccountId,
        );
        await markSelectedRoomRead();
        await refreshTypingIndicator();
    }

    function startTypingPolling() {
        if (typingPollIntervalId) {
            clearInterval(typingPollIntervalId);
            typingPollIntervalId = null;
        }
        if (!selectedRoomId || document.visibilityState !== "visible") return;
        typingPollIntervalId = setInterval(() => {
            void refreshTypingIndicator();
        }, 3000);
    }

    function startLiveRefreshPolling() {
        if (liveRefreshIntervalId) {
            clearInterval(liveRefreshIntervalId);
            liveRefreshIntervalId = null;
        }
        if (!selectedRoomId || document.visibilityState !== "visible") return;
        liveRefreshIntervalId = setInterval(() => {
            void refreshActiveConversation();
        }, LIVE_REFRESH_INTERVAL_MS);
    }

    function queueTypingUpdate(typing) {
        if (!selectedRoomId) return;
        const now = Date.now();
        if (typingSendTimeoutId) {
            clearTimeout(typingSendTimeoutId);
            typingSendTimeoutId = null;
        }
        if (
            typing &&
            typingActive &&
            now - lastTypingSentAt < TYPING_SEND_DEBOUNCE_MS
        ) {
            typingSendTimeoutId = setTimeout(() => {
                queueTypingUpdate(false);
            }, TYPING_IDLE_RESET_MS);
            return;
        }
        if (!typing && !typingActive) return;
        typingActive = typing;
        lastTypingSentAt = now;
        void apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(selectedRoomId)}/typing`,
            {
                method: "POST",
                body: JSON.stringify({
                    typing,
                    ttlSeconds: TYPING_TTL_SECONDS,
                }),
            },
        ).catch(() => undefined);
        if (typing) {
            typingSendTimeoutId = setTimeout(() => {
                queueTypingUpdate(false);
            }, TYPING_IDLE_RESET_MS);
        }
    }

    async function refreshTypingIndicator() {
        if (!selectedRoomId) return;
        const res = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(selectedRoomId)}/typing`,
        );
        const typingStatusEl = document.getElementById(
            "messages-typing-status",
        );
        if (!typingStatusEl) return;
        if (!res.ok) {
            typingStatusEl.innerHTML = "";
            return;
        }
        const payload = await res.json();
        const typers = payload?.data ?? [];
        if (!typers.length) {
            typingStatusEl.innerHTML = "";
            return;
        }
        const names = typers
            .slice(0, 2)
            .map(
                (typer) => typer.displayName || typer.handle || typer.accountId,
            )
            .join(", ");
        const typingLabel = i18n
            .t("module.social.messages.typing_users")
            .replace("{names}", names);
        typingStatusEl.innerHTML = `<span class="messages-typing-indicator" aria-hidden="true"><span></span><span></span><span></span></span><span class="messages-typing-label">${escapeHtml(typingLabel)}</span>`;
    }

    function extensionFromType(type) {
        const normalized = (type || "").split(";")[0].toLowerCase();
        if (normalized === "image/png") return "png";
        if (normalized === "image/webp") return "webp";
        if (normalized === "image/gif") return "gif";
        return "jpg";
    }

    function bindRoomHeaderEvents() {
        const input = document.getElementById("messages-room-avatar-input");
        input?.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file || !selectedRoomId) return;
            const ext = extensionFromType(file.type);
            const key = `chatrooms/${selectedRoomId}-${Date.now()}.${ext}`;
            const buffer = await file.arrayBuffer();
            const upload = await apiFetch(`/api/v1/files/${key}`, {
                method: "PUT",
                headers: { "content-type": file.type || "image/jpeg" },
                body: buffer,
            });
            if (!upload.ok) return;
            const update = await apiFetch(
                `/api/v1/messages/rooms/${encodeURIComponent(selectedRoomId)}`,
                {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ avatarKey: key }),
                },
            );
            if (update.ok) await openRoom(selectedRoomId);
        });
        const leaveButton = document.getElementById("messages-room-leave-btn");
        leaveButton?.addEventListener("click", async () => {
            const leaveHandle = leaveButton.getAttribute("data-leave-handle");
            await leaveSelectedRoom(leaveHandle);
        });
        const memberSummaryButton = document.getElementById(
            "messages-member-summary-btn",
        );
        memberSummaryButton?.addEventListener("click", async () => {
            if (!selectedRoomId) return;
            const selectedRoom = rooms.find(
                (room) => String(room.id) === String(selectedRoomId),
            );
            if (!selectedRoom) return;
            const meetingSummary = await loadMeetingChatSummary(selectedRoomId);
            if (meetingSummary) {
                await openPopup({
                    title: i18n.t("module.social.messages.present_users_title"),
                    body: renderMemberSummaryBody({
                        members: meetingSummary.activeParticipants ?? [],
                        emptyText: i18n.t(
                            "module.social.messages.present_users_empty",
                        ),
                        presentStatusText: i18n.t(
                            "module.social.messages.present_now",
                        ),
                    }),
                    actions: [
                        {
                            id: "close",
                            label: i18n.t("ui.reuse.close"),
                            variant: "confirm",
                        },
                    ],
                    maxWidth: "560px",
                });
                return;
            }
            await openPopup({
                title: i18n.t("module.social.messages.member_summary_title"),
                body: renderMemberSummaryBody({
                    members: selectedRoom.members ?? [],
                    emptyText: i18n.t(
                        "module.social.messages.member_summary_empty",
                    ),
                }),
                actions: [
                    {
                        id: "close",
                        label: i18n.t("ui.reuse.close"),
                        variant: "confirm",
                    },
                ],
                maxWidth: "560px",
            });
        });
    }

    async function reloadRoomsList() {
        rooms = await loadRooms(i18n);
        const selectedRoom = rooms.find(
            (room) => String(room.id) === String(selectedRoomId),
        );
        syncComposerAvailability(selectedRoom ?? null);
        renderRoomsListIntoDom();
    }

    async function leaveSelectedRoom(handle) {
        if (!selectedRoomId || !handle) return;
        const leaveResult = await openPopup({
            title: i18n.t("module.social.messages.leave_confirm_title"),
            body: `<p>${escapeHtml(i18n.t("module.social.messages.leave_confirm_body").replace("{name}", handle))}</p>`,
            variant: "danger",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
                {
                    id: "confirm",
                    label: i18n.t("module.social.messages.leave_conversation"),
                    variant: "confirm",
                },
            ],
        });
        if (leaveResult !== "confirm") return;
        const roomIdToLeave = selectedRoomId;
        const response = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomIdToLeave)}/members/${encodeURIComponent(handle)}`,
            { method: "DELETE" },
        );
        if (!response.ok) {
            showToast(i18n.t("module.social.messages.leave_failed"), {
                variant: "error",
            });
            return;
        }
        await reloadRoomsList();
        if (!rooms.length) {
            selectedRoomId = null;
            history.replaceState({}, "", "/messages");
            const headerSlot = document.getElementById(
                "messages-thread-header-slot",
            );
            const bannerSlot = document.getElementById(
                "messages-request-banner-slot",
            );
            const typingStatus = document.getElementById(
                "messages-typing-status",
            );
            const threadList = document.getElementById("messages-thread-list");
            if (headerSlot) headerSlot.innerHTML = "";
            if (bannerSlot) bannerSlot.innerHTML = "";
            if (typingStatus) typingStatus.textContent = "";
            if (threadList) threadList.innerHTML = "";
            syncComposerAvailability(null);
            return;
        }
        const fallbackRoomId =
            rooms.find((room) => String(room.id) !== String(roomIdToLeave))
                ?.id ?? rooms[0].id;
        selectedRoomId = fallbackRoomId;
        history.replaceState(
            {},
            "",
            `/messages/${encodeURIComponent(fallbackRoomId)}`,
        );
        await openRoom(fallbackRoomId);
        await refreshTypingIndicator();
        startTypingPolling();
        startLiveRefreshPolling();
    }

    /**
     * Creates or reopens a direct conversation from a selected user handle and
     * updates the page state to show that room immediately.
     *
     * @param {string} handle - The selected user's handle.
     * @returns {Promise<void>}
     */
    async function createConversationFromHandle(handle) {
        const createRes = await apiFetch("/api/v1/messages/rooms", {
            method: "POST",
            body: JSON.stringify({ handles: [handle] }),
        });
        if (!createRes.ok) {
            showToast(i18n.t("module.social.messages.start_failed"), {
                variant: "error",
            });
            return;
        }
        const createPayload = await createRes.json();
        const newRoomId = createPayload?.data?.id;
        if (!newRoomId && createPayload?.data?.requiresApproval) {
            showToast(i18n.t("module.social.messages.request_sent"), {
                variant: "info",
            });
            await reloadRoomsList();
            return;
        }
        if (!newRoomId) return;
        selectedRoomId = newRoomId;
        history.pushState({}, "", `/messages/${encodeURIComponent(newRoomId)}`);
        await openRoom(newRoomId);
        await reloadRoomsList();
    }

    const sidebarHtml = `<div class="messages-sidebar-content">
        <header class="messages-rooms-header">
            <button type="button" class="messages-new-btn" id="messages-new-btn">
                ${escapeHtml(i18n.t("module.social.messages.new"))}
            </button>
        </header>
        <ul class="messages-rooms-list" id="messages-rooms-list">
            ${renderRoomList(rooms, currentAccountId, selectedRoomId, i18n)}
        </ul>
    </div>`;

    const elements = [
        {
            id: "messages-thread",
            label: i18n.t("ui.reuse.messages"),
            gridSize: { default: [12, 8], min: [4, 4], max: "full" },
            render: () =>
                `<section class="messages-thread">
                    <div id="messages-thread-header-slot"></div>
                    <div id="messages-request-banner-slot"></div>
                    <div class="messages-typing-status" id="messages-typing-status"></div>
                    <div class="messages-thread-list" id="messages-thread-list"></div>
                    <form class="messages-composer" id="messages-composer">
                        <textarea
                            id="messages-composer-input"
                            class="messages-composer-input"
                            placeholder="${escapeHtml(i18n.t("module.social.messages.placeholder"))}"
                            aria-label="${escapeHtml(i18n.t("module.social.messages.placeholder"))}"
                            rows="2"
                        ></textarea>
                        <button type="submit" class="messages-composer-send">
                            ${escapeHtml(i18n.t("module.social.messages.send"))}
                        </button>
                    </form>
                </section>`,
            onRender: () => {
                const threadList = document.getElementById(
                    "messages-thread-list",
                );
                const form = document.getElementById("messages-composer");

                threadList?.addEventListener("click", async (clickEvent) => {
                    const reactionButton = clickEvent.target.closest(
                        "[data-message-id][data-emoji]",
                    );
                    if (
                        reactionButton &&
                        reactionButton.classList.contains(
                            "messages-reaction-chip",
                        )
                    ) {
                        await toggleReaction(
                            reactionButton.getAttribute("data-message-id"),
                            reactionButton.getAttribute("data-emoji"),
                        );
                        return;
                    }
                    if (
                        reactionButton &&
                        reactionButton.classList.contains(
                            "messages-reaction-add-btn",
                        )
                    ) {
                        await toggleReaction(
                            reactionButton.getAttribute("data-message-id"),
                            reactionButton.getAttribute("data-emoji"),
                        );
                        return;
                    }
                    const button = clickEvent.target.closest(
                        ".messages-load-earlier-btn",
                    );
                    if (!button || !selectedRoomId) return;
                    const beforeTime = button.getAttribute("data-before-time");
                    if (!beforeTime) return;
                    const key = await getRoomKey(selectedRoomId);
                    await renderThread(
                        selectedRoomId,
                        key,
                        threadList,
                        i18n,
                        currentAccountId,
                        beforeTime,
                    );
                });

                form?.addEventListener("submit", async (event) => {
                    event.preventDefault();
                    if (!selectedRoomId) return;
                    const currentRoom = rooms.find(
                        (room) => String(room.id) === String(selectedRoomId),
                    );
                    if (
                        currentRoom?.canSend === false ||
                        currentRoom?.isArchived
                    ) {
                        showToast(
                            i18n.t(
                                "module.social.messages.archived_cannot_send",
                            ),
                            { variant: "error" },
                        );
                        return;
                    }
                    const input = document.getElementById(
                        "messages-composer-input",
                    );
                    const text = (input?.value ?? "").trim();
                    if (!text) return;
                    queueTypingUpdate(false);
                    const key = await getRoomKey(selectedRoomId);
                    if (!key) {
                        showToast(
                            i18n.t("module.social.messages.key_unavailable"),
                            {
                                variant: "error",
                            },
                        );
                        return;
                    }
                    const { iv, ciphertext } = await encryptMessage(key, text);
                    const res = await apiFetch(
                        `/api/v1/messages/rooms/${encodeURIComponent(selectedRoomId)}/messages`,
                        {
                            method: "POST",
                            body: JSON.stringify({ ciphertext, iv }),
                        },
                    );
                    if (!res.ok) {
                        const payload = await res.json().catch(() => null);
                        const code = payload?.error?.code;
                        if (code === "not_member") {
                            showToast(
                                i18n.t(
                                    "module.social.messages.not_member_cannot_send",
                                ),
                                { variant: "error" },
                            );
                            await reloadRoomsList();
                            return;
                        }
                        if (code === "chat_archived") {
                            showToast(
                                i18n.t(
                                    "module.social.messages.archived_cannot_send",
                                ),
                                { variant: "error" },
                            );
                            await reloadRoomsList();
                            return;
                        }
                        return;
                    }
                    if (input) input.value = "";
                    if (threadList) {
                        await renderThread(
                            selectedRoomId,
                            key,
                            threadList,
                            i18n,
                            currentAccountId,
                        );
                    }
                    await refreshTypingIndicator();
                    startLiveRefreshPolling();
                });

                const composerInput = document.getElementById(
                    "messages-composer-input",
                );
                composerInput?.addEventListener("input", () => {
                    const hasText = Boolean((composerInput.value ?? "").trim());
                    queueTypingUpdate(hasText);
                });
                composerInput?.addEventListener("keydown", (keyboardEvent) => {
                    if (
                        keyboardEvent.key === "Enter" &&
                        keyboardEvent.ctrlKey &&
                        !keyboardEvent.shiftKey
                    ) {
                        keyboardEvent.preventDefault();
                        form?.requestSubmit();
                    }
                });

                if (selectedRoomId) {
                    void openRoom(selectedRoomId);
                    void refreshTypingIndicator();
                    startTypingPolling();
                    startLiveRefreshPolling();
                }
            },
        },
    ];

    window.addEventListener(
        "popstate",
        () => {
            const match = window.location.pathname.match(
                /^\/messages\/([^/]+)$/,
            );
            const id = match ? decodeURIComponent(match[1]) : null;
            if (id) {
                queueTypingUpdate(false);
                selectedRoomId = id;
                void openRoom(id);
                void refreshTypingIndicator();
                startTypingPolling();
                startLiveRefreshPolling();
            }
        },
        { signal },
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            startTypingPolling();
            startLiveRefreshPolling();
            if (document.visibilityState === "visible") {
                void refreshTypingIndicator();
                void refreshActiveConversation();
            }
        },
        { signal },
    );

    signal?.addEventListener(
        "abort",
        () => {
            if (typingSendTimeoutId) clearTimeout(typingSendTimeoutId);
            if (typingPollIntervalId) clearInterval(typingPollIntervalId);
            if (liveRefreshIntervalId) clearInterval(liveRefreshIntervalId);
        },
        { once: true },
    );

    function bindSidebarEvents() {
        const roomsList = document.getElementById("messages-rooms-list");
        roomsList?.addEventListener("click", async (clickEvent) => {
            const requestActionButton = clickEvent.target.closest(
                ".messages-room-request-approve, .messages-room-request-reject",
            );
            if (requestActionButton) {
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
                const roomItem = clickEvent.target.closest("[data-room-id]");
                const roomId = roomItem?.getAttribute("data-room-id");
                const requestId = clickEvent.target
                    .closest("[data-request-id]")
                    ?.getAttribute("data-request-id");
                if (!requestId || !roomId) return;
                if (
                    requestActionButton.classList.contains(
                        "messages-room-request-approve",
                    )
                ) {
                    await respondToPendingRequest(requestId, "approve", roomId);
                    return;
                }
                await respondToPendingRequest(requestId, "reject", roomId);
                return;
            }
            const item = clickEvent.target.closest("[data-room-id]");
            if (!item) return;
            const id = item.getAttribute("data-room-id");
            queueTypingUpdate(false);
            selectedRoomId = id;
            roomsList
                .querySelectorAll(".messages-room--active")
                .forEach((activeItem) =>
                    activeItem.classList.remove("messages-room--active"),
                );
            item.classList.add("messages-room--active");
            history.pushState({}, "", `/messages/${encodeURIComponent(id)}`);
            await openRoom(id);
            await refreshTypingIndicator();
            startTypingPolling();
            startLiveRefreshPolling();
        });

        const newBtn = document.getElementById("messages-new-btn");
        newBtn?.addEventListener("click", () => {
            openSearchPopup({
                endpoint: "/api/v1/messages/users/lookup",
                category: "user",
                ariaLabel: i18n.t("module.social.messages.new"),
                noResultsText: i18n.t("ui.layout.search.no_results"),
                onSelect: async (result) => {
                    if (!result?.handle) return;
                    await createConversationFromHandle(result.handle);
                },
            });
        });
    }

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements,
        preferenceKey: "messages-layout",
        i18n,
        toolbar: [
            {
                id: "messages-sidebar",
                label: i18n.t("ui.reuse.messages"),
                render: () => sidebarHtml,
            },
        ],
        pageContext: {
            title: i18n.t("ui.reuse.messages"),
            subtitle: i18n.t("module.social.messages.page_subtitle"),
        },
        onRender: bindSidebarEvents,
    });

    await composer.init();
    startTypingPolling();
    startLiveRefreshPolling();
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
