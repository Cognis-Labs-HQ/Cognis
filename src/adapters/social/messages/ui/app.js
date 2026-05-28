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
import { createPageComposer } from "/static/reuse/page-composer/init.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { createAnchoredPopup, openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import { resolveMemberDisplayName } from "/static/reuse/member-display-name.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { formatDate, getEffectiveTimezone } from "/static/reuse/timestamp.js";
import { normalizeMessageStyle } from "/static/reuse/message-style-options.js";
import {
    hexToBytes,
    bytesToHex,
    importRoomKey,
} from "/static/reuse/crypto-utils.js";
import {
    buildProfileAvatarMarkup,
    hydrateProfileAvatars,
    handleProfileAvatarError,
    isProfileAvatarUnavailable,
} from "/static/gateways/social/reuse/profile-avatar.js";
import { createRoomKeyStore } from "./room-keys.mjs";

const TEXT_ENCODER = new TextEncoder();
const MESSAGE_UNAVAILABLE_PLACEHOLDER = "…";
const MAX_EMOJI_GRID_SIZE = 80;
const MESSAGE_WRAP_THRESHOLD = 80;
const MAX_VISIBLE_REACTION_CHIPS = 5;

let cachedEmojiList = null;
let cachedEmojiUsage = [];
const reactionHoverPopup = createAnchoredPopup({
    className: "messages-reaction-hover-popup",
});
const readReceiptHoverPopup = createAnchoredPopup({
    className: "messages-read-receipt-popup",
});

const TYPING_TTL_SECONDS = 8;
const TYPING_IDLE_RESET_MS = (TYPING_TTL_SECONDS - 3) * 1000;
const TYPING_SEND_DEBOUNCE_MS = 1200;
const LIVE_REFRESH_INTERVAL_MS = 2500;
const LAST_OPENED_ROOM_KEY = "messages:last-opened-room";
const MESSAGE_TEMPLATES_STORAGE_KEY = "messages:saved-templates:v1";
const MAX_SAVED_MESSAGE_TEMPLATES = 100;

/**
 * Returns a sanitized template record or null when required fields are missing.
 *
 * @param {unknown} record
 * @returns {{id: string; title: string; content: string} | null}
 */
function normalizeMessageTemplateRecord(record) {
    if (!record || typeof record !== "object") return null;
    const id = String(record.id ?? "").trim();
    const title = String(record.title ?? "").trim();
    const content = String(record.content ?? "").trim();
    if (!id || !title || !content) return null;
    return {
        id,
        title,
        content,
    };
}

function loadSavedMessageTemplates() {
    try {
        const raw = localStorage.getItem(MESSAGE_TEMPLATES_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((entry) => normalizeMessageTemplateRecord(entry))
            .filter(Boolean);
    } catch {
        return [];
    }
}

function persistSavedMessageTemplates(templates) {
    const normalizedTemplates = Array.isArray(templates)
        ? templates
              .map((entry) => normalizeMessageTemplateRecord(entry))
              .filter(Boolean)
        : [];
    localStorage.setItem(
        MESSAGE_TEMPLATES_STORAGE_KEY,
        JSON.stringify(normalizedTemplates),
    );
}

function resolveTemplateRecipient(room, currentAccountId) {
    const members = Array.isArray(room?.members) ? room.members : [];
    const preferredRecipient =
        members.find(
            (member) => String(member?.accountId ?? "") !== currentAccountId,
        ) ??
        members[0] ??
        null;
    if (!preferredRecipient) return null;
    return {
        username: String(preferredRecipient?.handle ?? "").trim(),
        displayName: String(
            preferredRecipient?.displayName ?? preferredRecipient?.handle ?? "",
        ).trim(),
    };
}

function resolveMessageTemplateVariables(text, room, currentAccountId) {
    if (typeof text !== "string") return "";
    const recipient = resolveTemplateRecipient(room, currentAccountId);
    const values = {
        username: recipient?.username ?? "",
        handle: recipient?.username ?? "",
        display_name: recipient?.displayName ?? "",
        displayName: recipient?.displayName ?? "",
    };
    return formatTemplate(text, values);
}

function createMessageTemplateId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const randomBytes = crypto.getRandomValues(new Uint8Array(12));
    const randomSuffix = Array.from(randomBytes, (value) =>
        value.toString(16).padStart(2, "0"),
    ).join("");
    return `template-${Date.now().toString(36)}-${randomSuffix}`;
}

const { getRoomKey, requireRoomKey, resolveThreadRoomKey } = createRoomKeyStore(
    {
        fetchRoomKey: apiFetch,
        importKey: importRoomKey,
    },
);

/**
 * Fetches the full emoji list from the social gateway static asset, caching
 * the result in memory. Falls back to an empty array on network failure.
 *
 * @returns {Promise<Array<{emoji: string, name: string}>>}
 */
async function loadAllEmojis() {
    if (cachedEmojiList) return cachedEmojiList;
    try {
        const response = await fetch("/static/gateways/social/emojis.json");
        if (response.ok) {
            cachedEmojiList = await response.json();
        }
    } catch {
        // fall through to empty list (lines below)
    }
    cachedEmojiList = cachedEmojiList ?? [];
    return cachedEmojiList;
}

/**
 * Fetches the top emoji usage records for the current user from the server and
 * stores them in the module-level cache. Returns an empty array on failure so
 * the quick strip falls back to the first five emojis in the loaded list.
 *
 * @returns {Promise<Array<{emoji: string, usageCount: number}>>}
 */
async function fetchEmojiUsage() {
    try {
        const response = await apiFetch("/api/v1/messages/emoji-usage");
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    } catch {
        return [];
    }
}

/**
 * Records an emoji pick: updates the module-level cache immediately so the
 * quick strip reflects the choice at next render, then persists to the server.
 * Failures are silent.
 *
 * @param {string} emoji
 */
function recordEmojiUsage(emoji) {
    const normalized = normalizeReactionEmoji(emoji);
    if (!normalized) return;
    const existing = cachedEmojiUsage.find(
        (entry) => normalizeReactionEmoji(entry.emoji) === normalized,
    );
    if (existing) {
        existing.usageCount += 1;
    } else {
        cachedEmojiUsage.push({ emoji: normalized, usageCount: 1 });
    }
    cachedEmojiUsage.sort(
        (entryA, entryB) => entryB.usageCount - entryA.usageCount,
    );
    apiFetch("/api/v1/messages/emoji-usage", {
        method: "POST",
        body: JSON.stringify({ emoji: normalized }),
    }).catch(() => undefined);
}

/**
 * Returns the five emojis to show in the quick-reaction strip.
 * Emojis the user has used most are ranked first; remaining slots are filled
 * from the first entries in the loaded emoji list (no hardcoded defaults).
 *
 * @returns {string[]}
 */
function getQuickReactionEmojis(count = 5) {
    const sortedByUsage = cachedEmojiUsage
        .map((entry) => normalizeReactionEmoji(entry.emoji))
        .filter(Boolean);

    const result = [];
    for (const emoji of sortedByUsage) {
        if (result.length >= count) break;
        if (!result.includes(emoji)) result.push(emoji);
    }
    for (const entry of cachedEmojiList ?? []) {
        if (result.length >= count) break;
        const normalized = normalizeReactionEmoji(entry.emoji);
        if (normalized && !result.includes(normalized)) result.push(normalized);
    }
    return result;
}

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

function formatHandleNotation(handle) {
    return `@${handle}`;
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
 * Returns a readable emoji label by resolving the entry's i18n name key.
 * Falls back to the emoji token itself when no matching entry is found.
 *
 * @param {string} emoji
 * @param {object} i18n
 * @returns {string}
 */
function emojiDisplayName(emoji, i18n) {
    const normalized = normalizeReactionEmoji(emoji);
    let entry = null;
    for (const item of cachedEmojiList ?? []) {
        if (normalizeReactionEmoji(item.emoji) === normalized) {
            entry = item;
            break;
        }
    }
    if (!entry) return emoji;
    return i18n?.t(entry.name) ?? emoji;
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

const threadRenderSignatures = new Map();

function stableJson(value) {
    return JSON.stringify(value);
}

function messageRenderSignature(messages, pendingRequest) {
    return stableJson({
        pendingRequest: pendingRequest
            ? {
                  id: pendingRequest.id,
                  direction: pendingRequest.direction,
                  canRespond: pendingRequest.canRespond,
              }
            : null,
        messages: messages.map((message) => ({
            id: message.id,
            createdAt: message.createdAt,
            senderId: message.senderId,
            contentType: message.contentType,
            ciphertext: message.ciphertext,
            iv: message.iv,
            authTag: message.authTag,
            deliveredToCount: message.deliveredToCount,
            reactions: (message.reactions ?? []).map((reaction) => ({
                emoji: reaction.emoji,
                count: reaction.count,
                reactedByMe: reaction.reactedByMe,
            })),
            readBy: (message.readBy ?? []).map((reader) => ({
                accountId: reader.accountId,
            })),
        })),
    });
}

function roomListRenderSignature(rooms, selectedRoomId) {
    return stableJson({
        selectedRoomId,
        rooms: rooms.map((room) => ({
            id: room.id,
            title: room.title,
            kind: room.kind,
            unread: room.unread,
            isArchived: room.isArchived,
            canSend: room.canSend,
            pendingRequest: room.pendingRequest
                ? {
                      id: room.pendingRequest.id,
                      direction: room.pendingRequest.direction,
                      canRespond: room.pendingRequest.canRespond,
                  }
                : null,
            lastMessagePreview: room.lastMessagePreview,
            lastMessage: room.lastMessage
                ? {
                      id: room.lastMessage.id,
                      createdAt: room.lastMessage.createdAt,
                      senderId: room.lastMessage.senderId,
                      senderDisplayName: room.lastMessage.senderDisplayName,
                      senderHandle: room.lastMessage.senderHandle,
                      contentType: room.lastMessage.contentType,
                      ciphertext: room.lastMessage.ciphertext,
                      iv: room.lastMessage.iv,
                  }
                : null,
            avatarKey: room.avatarKey,
            members: (room.members ?? []).map((member) => ({
                accountId: member.accountId,
                handle: member.handle,
                displayName: member.displayName,
                username: member.username,
                avatarKey: member.avatarKey,
            })),
        })),
    });
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
            otherMembers.map(resolveMemberDisplayName).join(", ") ||
            room.title ||
            room.id
        );
    }
    return (
        room.title ||
        otherMembers.map(resolveMemberDisplayName).join(", ") ||
        room.id
    );
}

function renderMemberCountControl(room, members, i18n) {
    const label = `${String(members.length)} ${i18n.t("module.social.messages.members")}`;
    if (room?.kind !== "group") {
        return `<span class="messages-thread-subtitle">${escapeHtml(label)}</span>`;
    }
    return `<span class="messages-thread-subtitle messages-thread-subtitle-action" id="messages-member-summary-btn" role="button" tabindex="0">${escapeHtml(label)}</span>`;
}

function randomSample(values, count) {
    return values
        .map((value) => ({ value, rank: Math.random() }))
        .sort((a, b) => a.rank - b.rank)
        .slice(0, count)
        .map((item) => item.value);
}

function renderMemberInitials(member) {
    const label = resolveMemberDisplayName(member);
    const color = pickInitialsColor(member.handle || member.accountId || label);
    return `<span class="messages-classroom-collage-tile" style="--initials-bg: ${escapeHtml(color)};">${escapeHtml(getInitialsText(label))}</span>`;
}

function renderRoomAvatar(room, currentAccountId) {
    if (!room) return "";
    const members = room.members ?? [];
    if (room.kind === "classroom") {
        if (room.avatarKey && !isProfileAvatarUnavailable(room.avatarKey)) {
            const label = room.title || room.id;
            return buildProfileAvatarMarkup({
                avatarKey: room.avatarKey,
                label,
                colorSeed: room.id || label,
                avatarClass: "messages-thread-avatar",
                imageClass: "messages-thread-avatar-img",
                fallbackClass: "messages-thread-initials",
            });
        }
        const picked = randomSample(members, 4);
        while (picked.length < 4) picked.push({ handle: "", displayName: "" });
        return `<div class="messages-classroom-collage">${picked.map(renderMemberInitials).join("")}</div>`;
    }
    const other =
        members.find((member) => member.accountId !== currentAccountId) ??
        members[0];
    const label = other
        ? resolveMemberDisplayName(other)
        : room.title || room.id;
    return buildProfileAvatarMarkup({
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
                    room,
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
                const archivedClass = room.isArchived
                    ? " messages-room--archived"
                    : "";
                const archivedHint = room.isArchived
                    ? `<span class="messages-room-archived-hint">${escapeHtml(i18n.t("module.social.messages.archived_locked"))}</span>`
                    : "";
                return `
      <li class="messages-room ${isActive ? "messages-room--active" : ""}${archivedClass}"
          data-room-id="${escapeHtml(room.id)}">
        ${avatar}
        <span class="messages-room-meta">
            <span class="messages-room-title">${escapeHtml(titleSource)}</span>
            <span class="messages-room-preview">${escapeHtml(preview)}</span>
            ${archivedHint}
        </span>
        ${unreadBadge}
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
        // Clear stale status badges after readers advance to newer messages.
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
    const quickEmojis = getQuickReactionEmojis(5 + mergedByEmoji.size);
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

function renderComposerPreviewMarkup(content, emptyMessage) {
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
        <circle
            cx="8"
            cy="8"
            r="5.25"
            stroke="currentColor"
            stroke-width="1.5"
        ></circle>
        ${deliveredTickMarkup}
    </svg>`;
}

function hideReactionHoverPopup() {
    reactionHoverPopup.hide();
}

function showReactionHoverPopup(reactionChipButton) {
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

function hideReadReceiptHoverPopup() {
    readReceiptHoverPopup.hide();
}

function showReadReceiptHoverPopup(statusElement, readers, i18n) {
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

/**
 * Parses a payload that may be URI-encoded JSON or raw JSON and returns an
 * array shape for safe downstream rendering.
 *
 * @param {unknown} rawPayload
 * @returns {Array<unknown>}
 */
function parseEncodedPayload(rawPayload) {
    const normalizedRawPayload = String(rawPayload ?? "[]");
    const parseCandidates = [normalizedRawPayload];
    try {
        // Try URI-decoded JSON first, then fall back to the raw payload.
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

async function openReactionDetailsPopup(reactionDetailsRows, i18n) {
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

function formatRoomListAvatar(room, displayedMember, titleSource) {
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
    { force = false } = {},
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
        ordered.map(async (msg) => {
            const text = key
                ? await decryptMessageOrReturnPlaintext(key, msg)
                : null;
            return { ...msg, text };
        }),
    );
    let previousDateLabel = "";
    const readersAtMessage = buildLastReadMap(decoded);
    const isSpeechBubbles = resolveMessageStyle() === "speech_bubbles";
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
            const timeLabel = msg.createdAt
                ? `<time class="messages-message-time" datetime="${escapeHtml(msg.createdAt)}">${escapeHtml(formatMessageTime(msg.createdAt))}</time>`
                : "";
            const readers = Array.isArray(msg.readBy) ? msg.readBy : [];
            const deliveredCount = Number(msg.deliveredToCount ?? 0);
            const isDelivered = deliveredCount > 0 || readers.length > 0;
            const hadPriorReaders = readers.length > 0;
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
                hadPriorReaders,
                i18n,
            );
            const ownRowClass = isOwn ? " messages-message-row--own" : "";
            const displayName =
                msg.senderDisplayName || msg.senderHandle || msg.senderId;
            const handle = msg.senderHandle || "";
            const senderDisplaySpan = `<span class="messages-message-sender">${escapeHtml(displayName)}</span>`;
            const senderHandleSpan = handle
                ? `<span class="messages-message-handle">${escapeHtml(formatHandleNotation(handle))}</span>`
                : "";
            const senderLabel = isOwn
                ? senderHandleSpan
                : `${senderDisplaySpan}${senderHandleSpan}`;
            const bubbleAvatarMarkup = formatMessageBubbleAvatar(msg);
            const reactionRows = renderReactionRows(msg, i18n, isOwn);
            const metadataRow =
                timeLabel || statusBlock
                    ? `<span class="messages-message-meta">${timeLabel}${statusBlock}</span>`
                    : "";
            const innerMetaRow = isSpeechBubbles ? "" : metadataRow;
            const outerMetaRow = isSpeechBubbles ? metadataRow : "";
            return `${showDateDivider}<div class="messages-message-row${ownRowClass}" data-message-id="${escapeHtml(msg.id)}">
            ${isOwn ? "" : formatMessageAvatar(msg)}
            <div class="messages-message-wrap">
                ${bubbleAvatarMarkup}
                ${reactionRows.pickerRow}
                <div class="messages-message${ownClass}">
                    ${senderLabel}
                    <div class="messages-message-content">
                        ${renderMessageBodyMarkup(msg.text)}
                        ${innerMetaRow}
                    </div>
                </div>
                ${outerMetaRow}
                ${reactionRows.activeRow}
            </div>
        </div>`;
        })
        .join("");

    const hasMore = messageList.length === 50;
    const oldestCreatedAt = ordered[0]?.createdAt ?? null;
    hideReactionHoverPopup();
    hideReadReceiptHoverPopup();

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
            `<button type="button" class="messages-load-earlier-btn" data-before-time="${escapeHtml(oldestCreatedAt)}">
                ${escapeHtml(i18n.t("module.social.messages.load_earlier"))}
            </button>`,
        );
    }

    if (!before) threadRenderSignatures.set(roomId, renderSignature);

    return { oldestCreatedAt, pendingRequest, changed: true };
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
        componentStringBaseUrls: [
            "/static/adapters/social/messages/languages",
            "/static/gateways/social/languages",
        ],
    });
    applyDocumentTitle(i18n, "ui.reuse.messages");

    root.classList.add("messages-page");
    root.dataset.messageStyle = resolveMessageStyle();
    root.addEventListener("error", handleProfileAvatarError, {
        capture: true,
        signal,
    });
    signal?.addEventListener(
        "abort",
        () => {
            root.classList.remove("messages-page");
            delete root.dataset.messageStyle;
        },
        { once: true },
    );

    const currentAccountId = localStorage.getItem("cognis_account") ?? "";

    const [loadedEmojis, loadedUsage] = await Promise.all([
        loadAllEmojis(),
        fetchEmojiUsage(),
    ]);
    cachedEmojiList = loadedEmojis;
    cachedEmojiUsage = loadedUsage;

    const initialPath = window.location.pathname;
    const initialRoomMatch = initialPath.match(/^\/messages\/([^/]+)$/);
    const rememberedRoomId = localStorage.getItem(LAST_OPENED_ROOM_KEY);
    let selectedRoomId = initialRoomMatch
        ? decodeURIComponent(initialRoomMatch[1])
        : rememberedRoomId;
    let typingSendTimeoutId = null;
    let typingPollIntervalId = null;
    let liveRefreshIntervalId = null;
    let lastRoomsListRenderSignature = null;
    let pendingBannerSlotElement = null;
    let typingActive = false;
    let lastTypingSentAt = 0;
    let savedMessageTemplates = loadSavedMessageTemplates();
    let openTemplatesPopupFromSidebar = null;

    const renderSidebarTemplateList = () => {
        const listElement = document.getElementById(
            "messages-sidebar-template-list",
        );
        if (!(listElement instanceof HTMLElement)) return;
        if (savedMessageTemplates.length === 0) {
            listElement.innerHTML = `<li class="messages-template-list-empty">${escapeHtml(i18n.t("module.social.messages.templates_empty"))}</li>`;
            return;
        }
        listElement.innerHTML = savedMessageTemplates
            .map(
                (templateRecord) =>
                    `<li class="messages-template-card" data-template-id="${escapeHtml(templateRecord.id)}">
                        <button type="button" class="messages-sidebar-template-load-btn" data-template-action="use" data-template-id="${escapeHtml(templateRecord.id)}">${escapeHtml(templateRecord.title)}</button>
                        <div class="messages-template-card-actions">
                            <button type="button" class="messages-sidebar-template-edit-btn" aria-label="${escapeHtml(i18n.t("module.social.messages.template_edit"))}" data-template-action="edit" data-template-id="${escapeHtml(templateRecord.id)}"><span class="messages-template-edit-icon" aria-hidden="true"></span></button>
                            <button type="button" class="messages-sidebar-template-delete-btn btn-cancel" aria-label="${escapeHtml(i18n.t("module.social.messages.template_delete"))}" data-template-action="delete" data-template-id="${escapeHtml(templateRecord.id)}">🗑</button>
                        </div>
                    </li>`,
            )
            .join("");
    };

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
    lastRoomsListRenderSignature = roomListRenderSignature(
        rooms,
        selectedRoomId,
    );

    async function loadRoom(roomId) {
        const res = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}`,
        );
        if (!res.ok) return null;
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

    /**
     * Builds a stable signature for pending-request state so UI updates only
     * run when request identity/direction/respondability actually changes.
     *
     * @param {Object|null} pendingRequest
     * @returns {string}
     */
    function getPendingRequestSignature(pendingRequest) {
        if (!pendingRequest) return "";
        return [
            pendingRequest.id ?? "",
            pendingRequest.direction ?? "",
            String(Boolean(pendingRequest.canRespond)),
        ].join(":");
    }

    /**
     * Reconciles pending-request state for the selected room and re-renders the
     * rooms list only when its pending-request signature changes.
     *
     * @param {Object|null} pendingRequest
     * @returns {void}
     */
    function setSelectedRoomPendingRequest(pendingRequest) {
        if (!selectedRoomId) return;
        const nextSignature = getPendingRequestSignature(pendingRequest);
        const selectedRoomIndex = rooms.findIndex(
            (room) => String(room.id) === String(selectedRoomId),
        );
        if (selectedRoomIndex < 0) return;
        const selectedRoom = rooms[selectedRoomIndex];
        const previousSignature = getPendingRequestSignature(
            selectedRoom.pendingRequest,
        );
        if (previousSignature === nextSignature) return;
        const updatedRoom = {
            ...selectedRoom,
            pendingRequest,
        };
        rooms = [
            ...rooms.slice(0, selectedRoomIndex),
            updatedRoom,
            ...rooms.slice(selectedRoomIndex + 1),
        ];
        renderRoomsListIntoDom();
    }

    /**
     * Synchronizes the request banner with current pending-request state.
     * Passing null clears any existing banner message/actions.
     *
     * @param {Object|null} pendingRequest
     * @returns {void}
     */
    function syncPendingRequestBanner(pendingRequest) {
        if (pendingBannerSlotElement && !pendingBannerSlotElement.isConnected) {
            pendingBannerSlotElement = null;
        }
        const pendingBannerSlot =
            pendingBannerSlotElement ??
            document.getElementById("messages-request-banner-slot");
        if (!pendingBannerSlot) return;
        pendingBannerSlotElement = pendingBannerSlot;
        pendingBannerSlot.innerHTML =
            renderPendingRequestBanner(pendingRequest);
    }

    function syncComposerAvailability(room) {
        const input = document.getElementById("messages-composer-input");
        const sendButton = document.querySelector(".messages-composer-send");
        const composeToggle = document.getElementById(
            "messages-composer-compose-toggle",
        );
        const previewToggle = document.getElementById(
            "messages-composer-preview-toggle",
        );
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
        if (previewToggle instanceof HTMLButtonElement) {
            previewToggle.disabled = !canSend;
        }
        if (composeToggle instanceof HTMLButtonElement) {
            composeToggle.disabled = !canSend;
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
            void hydrateProfileAvatars(headerSlot);
            bindRoomHeaderEvents();
        }
        syncComposerAvailability(room);
        syncPendingRequestBanner(room?.pendingRequest ?? null);
        const composerInputElement = document.getElementById(
            "messages-composer-input",
        );
        const composerPreviewElement = document.getElementById(
            "messages-composer-preview",
        );
        if (
            composerInputElement instanceof HTMLTextAreaElement &&
            composerPreviewElement instanceof HTMLElement
        ) {
            composerPreviewElement.innerHTML = renderComposerPreviewMarkup(
                resolveMessageTemplateVariables(
                    composerInputElement.value,
                    room,
                    currentAccountId,
                ),
                i18n.t("module.social.messages.preview_placeholder"),
            );
        }
        const templateBodyElement = document.getElementById(
            "messages-template-body",
        );
        const templatePreviewElement = document.getElementById(
            "messages-template-preview",
        );
        if (
            templateBodyElement instanceof HTMLTextAreaElement &&
            templatePreviewElement instanceof HTMLElement
        ) {
            templatePreviewElement.innerHTML = renderComposerPreviewMarkup(
                resolveMessageTemplateVariables(
                    templateBodyElement.value,
                    room,
                    currentAccountId,
                ),
                i18n.t("module.social.messages.preview_placeholder"),
            );
        }
        const key = await resolveThreadRoomKey(room, roomId);
        const threadResult = await renderThread(
            roomId,
            key,
            threadList,
            i18n,
            currentAccountId,
            undefined,
            { force: true },
        );
        if (threadResult) {
            const resolvedPendingRequest = threadResult.pendingRequest ?? null;
            setSelectedRoomPendingRequest(resolvedPendingRequest);
            syncPendingRequestBanner(resolvedPendingRequest);
        }
        await markSelectedRoomRead({ force: true });
        bindPendingRequestBannerEvents();
    }

    function renderRoomsListIntoDom({ force = false } = {}) {
        const roomsList = document.getElementById("messages-rooms-list");
        if (!roomsList) return;
        const renderSignature = roomListRenderSignature(rooms, selectedRoomId);
        if (!force && lastRoomsListRenderSignature === renderSignature) return;
        roomsList.innerHTML = renderRoomList(
            rooms,
            currentAccountId,
            selectedRoomId,
            i18n,
        );
        void hydrateProfileAvatars(roomsList);
        lastRoomsListRenderSignature = renderSignature;
    }

    function selectedRoomHasUnread() {
        return rooms.some(
            (room) =>
                String(room.id) === String(selectedRoomId) &&
                Number(room.unread ?? 0) > 0,
        );
    }

    async function markSelectedRoomRead({ force = false } = {}) {
        if (!selectedRoomId) return;
        if (!force && !selectedRoomHasUnread()) return;
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
        ).catch((error) => {
            console.error("[messages] pending-request action failed", {
                action,
                requestId,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        });
        if (!res) {
            showToast(i18n.t("module.social.messages.request_action_failed"), {
                variant: "error",
            });
            return;
        }
        if (!res.ok) return;
        const payload = await res.json().catch(() => null);
        await reloadRoomsList();
        if (action === "approve") {
            setSelectedRoomPendingRequest(null);
            syncPendingRequestBanner(null);
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
        const selectedRoom = rooms.find(
            (room) => String(room.id) === String(selectedRoomId),
        );
        const key = await resolveThreadRoomKey(selectedRoom, selectedRoomId);
        await renderThread(
            selectedRoomId,
            key,
            threadList,
            i18n,
            currentAccountId,
        );
    }

    async function openEmojiPickerPopup(messageId) {
        const allEmojis = await loadAllEmojis();
        const pickerPlaceholder = i18n.t(
            "module.social.messages.emoji_search_placeholder",
        );
        const pickerTitle = i18n.t("module.social.messages.emoji_more");

        function buildEmojiGridHtml(entries) {
            return entries
                .slice(0, MAX_EMOJI_GRID_SIZE)
                .map((entry) => {
                    const resolvedName = i18n.t(entry.name) ?? entry.name;
                    return `<button type="button" class="messages-emoji-picker-btn" data-emoji="${escapeHtml(entry.emoji)}" title="${escapeHtml(resolvedName)}">${escapeHtml(entry.emoji)}</button>`;
                })
                .join("");
        }

        await openPopup({
            title: pickerTitle,
            maxWidth: "420px",
            body: `<div class="messages-emoji-picker"><input type="text" class="messages-emoji-search" placeholder="${escapeHtml(pickerPlaceholder)}" autocomplete="off" /><div class="messages-emoji-grid">${buildEmojiGridHtml(allEmojis)}</div></div>`,
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen: (overlay) => {
                const searchInput = overlay.querySelector(
                    ".messages-emoji-search",
                );
                const grid = overlay.querySelector(".messages-emoji-grid");

                grid?.addEventListener("click", async (event) => {
                    const btn = event.target.closest(
                        ".messages-emoji-picker-btn",
                    );
                    if (!btn) return;
                    const chosenEmoji = btn.dataset.emoji;
                    overlay.querySelector("[data-popup-action]")?.click();
                    recordEmojiUsage(chosenEmoji);
                    await toggleReaction(messageId, chosenEmoji);
                });

                searchInput?.addEventListener("input", () => {
                    const query = searchInput.value
                        .normalize("NFC")
                        .toLowerCase()
                        .trim();
                    const filtered = query
                        ? allEmojis.filter((entry) => {
                              const resolvedName = (
                                  i18n.t(entry.name) ?? entry.name
                              )
                                  .normalize("NFC")
                                  .toLowerCase();
                              return resolvedName.includes(query);
                          })
                        : allEmojis;
                    if (grid) {
                        grid.innerHTML = buildEmojiGridHtml(filtered);
                    }
                });

                searchInput?.focus();
            },
        });
    }

    async function refreshActiveConversation() {
        if (!selectedRoomId || document.visibilityState !== "visible") return;
        await reloadRoomsList();
        const threadList = document.getElementById("messages-thread-list");
        if (!threadList) return;
        const selectedRoom = rooms.find(
            (room) => String(room.id) === String(selectedRoomId),
        );
        const key = await resolveThreadRoomKey(selectedRoom, selectedRoomId);
        const threadResult = await renderThread(
            selectedRoomId,
            key,
            threadList,
            i18n,
            currentAccountId,
        );
        if (threadResult) {
            const resolvedPendingRequest = threadResult.pendingRequest ?? null;
            setSelectedRoomPendingRequest(resolvedPendingRequest);
            syncPendingRequestBanner(resolvedPendingRequest);
        }
        if (threadResult?.changed || selectedRoomHasUnread()) {
            await markSelectedRoomRead();
        }
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
        memberSummaryButton?.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }
            event.preventDefault();
            memberSummaryButton.click();
        });
        memberSummaryButton?.addEventListener("click", async () => {
            if (!selectedRoomId) return;
            const selectedRoom = rooms.find(
                (room) => String(room.id) === String(selectedRoomId),
            );
            if (!selectedRoom) return;
            await openPopup({
                title: i18n.t("module.social.messages.member_summary_title"),
                body: renderMemberSummaryBody({
                    members: selectedRoom.members ?? [],
                    emptyText: i18n.t(
                        "module.social.messages.member_summary_empty",
                    ),
                }),
                onOpen: (overlay) => {
                    overlay.addEventListener(
                        "error",
                        handleProfileAvatarError,
                        {
                            capture: true,
                        },
                    );
                    void hydrateProfileAvatars(overlay);
                },
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
        <section class="messages-sidebar-section">
            <button type="button" class="messages-sidebar-section-label messages-sidebar-section-label--btn" id="messages-open-templates-btn">
                ${escapeHtml(i18n.t("module.social.messages.templates"))}
            </button>
            <ul class="messages-sidebar-template-list" id="messages-sidebar-template-list"></ul>
        </section>
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
                    <div class="messages-thread-list" id="messages-thread-list"></div>
                    <div class="messages-typing-status" id="messages-typing-status"></div>
                    <form class="messages-composer" id="messages-composer" data-composer-exclude-form-memory="true">
                        <div class="messages-composer-mode-row">
                            <button
                                type="button"
                                class="messages-composer-mode-toggle"
                                id="messages-composer-compose-toggle"
                                aria-pressed="true"
                            >${escapeHtml(i18n.t("module.social.messages.compose"))}</button>
                            <button
                                type="button"
                                class="messages-composer-mode-toggle"
                                id="messages-composer-preview-toggle"
                                aria-pressed="false"
                            >${escapeHtml(i18n.t("module.social.messages.preview"))}</button>
                        </div>
                        <div class="messages-composer-main">
                            <div
                                class="messages-composer-pane messages-composer-pane--compose"
                                id="messages-composer-compose-pane"
                            >
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
                            </div>
                            <div
                                id="messages-composer-preview-pane"
                                class="messages-composer-pane messages-composer-pane--preview"
                                hidden
                            >
                                <div
                                    id="messages-composer-preview"
                                    class="messages-composer-preview messages-message-body"
                                    aria-live="polite"
                                >${renderComposerPreviewMarkup("", i18n.t("module.social.messages.preview_placeholder"))}</div>
                            </div>
                        </div>
                    </form>
                </section>`,
            onRender: () => {
                const threadList = document.getElementById(
                    "messages-thread-list",
                );
                const form = document.getElementById("messages-composer");
                const composerInput = document.getElementById(
                    "messages-composer-input",
                );
                const composerSendButton = form?.querySelector(
                    ".messages-composer-send",
                );
                const composerPreview = document.getElementById(
                    "messages-composer-preview",
                );
                const composerComposePane = document.getElementById(
                    "messages-composer-compose-pane",
                );
                const composerPreviewPane = document.getElementById(
                    "messages-composer-preview-pane",
                );
                const composerComposeToggle = document.getElementById(
                    "messages-composer-compose-toggle",
                );
                const composerPreviewToggle = document.getElementById(
                    "messages-composer-preview-toggle",
                );
                let composerMode = "compose";
                let activeTemplateId = null;
                let templateEditor = null;
                let templateTitleInput = null;
                let templateBodyInput = null;
                let templatePreview = null;
                const passiveEventOptions = signal ? { signal } : undefined;
                const resolveSelectedRoomTemplateContent = (content) => {
                    const selectedRoom = rooms.find(
                        (room) => String(room.id) === String(selectedRoomId),
                    );
                    return resolveMessageTemplateVariables(
                        content,
                        selectedRoom,
                        currentAccountId,
                    );
                };
                const renderComposerPreview = () => {
                    if (!(composerPreview instanceof HTMLElement)) return;
                    const contentValue =
                        composerInput instanceof HTMLTextAreaElement
                            ? composerInput.value
                            : "";
                    const resolvedContent =
                        resolveSelectedRoomTemplateContent(contentValue);
                    composerPreview.innerHTML = renderComposerPreviewMarkup(
                        resolvedContent,
                        i18n.t("module.social.messages.preview_placeholder"),
                    );
                };
                const renderTemplateEditorPreview = () => {
                    if (!(templatePreview instanceof HTMLElement)) return;
                    const bodyValue =
                        templateBodyInput instanceof HTMLTextAreaElement
                            ? templateBodyInput.value
                            : "";
                    const resolvedContent =
                        resolveSelectedRoomTemplateContent(bodyValue);
                    templatePreview.innerHTML = renderComposerPreviewMarkup(
                        resolvedContent,
                        i18n.t("module.social.messages.preview_placeholder"),
                    );
                };
                const renderTemplatePopupBody = (isEditing) =>
                    `<form
                        class="messages-template-editor"
                        id="messages-template-editor"
                        aria-label="${escapeHtml(i18n.t("module.social.messages.template_editor"))}"
                    >
                        <label class="messages-template-label" for="messages-template-title">${escapeHtml(i18n.t("module.social.messages.template_title"))}</label>
                        <input
                            id="messages-template-title"
                            class="messages-template-title-input"
                            type="text"
                            maxlength="120"
                            placeholder="${escapeHtml(i18n.t("module.social.messages.template_title_placeholder"))}"
                        />
                        <label class="messages-template-label" for="messages-template-body">${escapeHtml(i18n.t("module.social.messages.template_body"))}</label>
                        <textarea
                            id="messages-template-body"
                            class="messages-template-body-input"
                            rows="4"
                            placeholder="${escapeHtml(i18n.t("module.social.messages.template_body_placeholder"))}"
                        ></textarea>
                        <div class="messages-template-token-row">
                            <span class="messages-template-token-label">${escapeHtml(i18n.t("module.social.messages.template_variables"))}</span>
                            <button type="button" class="messages-template-token-btn" data-template-token="{username}">{username}</button>
                            <button type="button" class="messages-template-token-btn" data-template-token="{displayName}">{displayName}</button>
                        </div>
                        <div class="messages-template-preview">
                            <p class="messages-template-preview-label">${escapeHtml(i18n.t("module.social.messages.template_preview"))}</p>
                            <div
                                id="messages-template-preview"
                                class="messages-template-preview-markup messages-message-body"
                                aria-live="polite"
                            >${renderComposerPreviewMarkup("", i18n.t("module.social.messages.preview_placeholder"))}</div>
                        </div>
                        <div class="messages-template-actions">
                            <button type="submit" class="btn-confirm">${escapeHtml(isEditing ? i18n.t("ui.reuse.save") : i18n.t("ui.reuse.create"))}</button>
                        </div>
                    </form>`;
                const editTemplateById = (templateId) => {
                    const templateRecord = savedMessageTemplates.find(
                        (entry) => String(entry.id) === String(templateId),
                    );
                    if (!templateRecord) return;
                    activeTemplateId = templateRecord.id;
                    if (templateTitleInput instanceof HTMLInputElement) {
                        templateTitleInput.value = templateRecord.title;
                    }
                    if (templateBodyInput instanceof HTMLTextAreaElement) {
                        templateBodyInput.value = templateRecord.content;
                    }
                    renderTemplateEditorPreview();
                };
                const bindTemplatePopupEvents = (overlay) => {
                    templateEditor = overlay.querySelector(
                        "#messages-template-editor",
                    );
                    templateTitleInput = overlay.querySelector(
                        "#messages-template-title",
                    );
                    templateBodyInput = overlay.querySelector(
                        "#messages-template-body",
                    );
                    templatePreview = overlay.querySelector(
                        "#messages-template-preview",
                    );
                    renderTemplateEditorPreview();
                    templateEditor?.addEventListener(
                        "submit",
                        (submitEvent) => {
                            submitEvent.preventDefault();
                            const titleValue =
                                templateTitleInput instanceof HTMLInputElement
                                    ? templateTitleInput.value.trim()
                                    : "";
                            const contentValue =
                                templateBodyInput instanceof HTMLTextAreaElement
                                    ? templateBodyInput.value.trim()
                                    : "";
                            if (!titleValue || !contentValue) {
                                showToast(
                                    i18n.t(
                                        "module.social.messages.template_invalid",
                                    ),
                                    { variant: "error" },
                                );
                                return;
                            }
                            if (
                                !activeTemplateId &&
                                savedMessageTemplates.length >=
                                    MAX_SAVED_MESSAGE_TEMPLATES
                            ) {
                                showToast(
                                    i18n.t(
                                        "module.social.messages.template_limit",
                                    ),
                                    { variant: "error" },
                                );
                                return;
                            }
                            const templateRecord = {
                                id:
                                    activeTemplateId ??
                                    createMessageTemplateId(),
                                title: titleValue,
                                content: contentValue,
                            };
                            const existingIndex =
                                savedMessageTemplates.findIndex(
                                    (entry) =>
                                        String(entry.id) ===
                                        String(templateRecord.id),
                                );
                            if (existingIndex >= 0) {
                                savedMessageTemplates = [
                                    ...savedMessageTemplates.slice(
                                        0,
                                        existingIndex,
                                    ),
                                    templateRecord,
                                    ...savedMessageTemplates.slice(
                                        existingIndex + 1,
                                    ),
                                ];
                            } else {
                                savedMessageTemplates = [
                                    templateRecord,
                                    ...savedMessageTemplates,
                                ];
                            }
                            persistSavedMessageTemplates(savedMessageTemplates);
                            renderSidebarTemplateList();
                            showToast(
                                i18n.t("module.social.messages.template_saved"),
                                { variant: "success" },
                            );
                            overlay
                                .querySelector('[data-popup-action="close"]')
                                ?.click();
                        },
                    );
                    templateBodyInput?.addEventListener("input", () => {
                        renderTemplateEditorPreview();
                    });
                    overlay.addEventListener("click", (clickEvent) => {
                        const tokenButton = clickEvent.target.closest(
                            "[data-template-token]",
                        );
                        if (!(tokenButton instanceof HTMLButtonElement)) return;
                        const token = String(
                            tokenButton.dataset.templateToken ?? "",
                        ).trim();
                        if (!token) return;
                        if (
                            !(templateBodyInput instanceof HTMLTextAreaElement)
                        ) {
                            return;
                        }
                        const start = templateBodyInput.selectionStart ?? 0;
                        const end = templateBodyInput.selectionEnd ?? 0;
                        const currentValue = templateBodyInput.value;
                        templateBodyInput.value = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
                        const nextCursor = start + token.length;
                        templateBodyInput.setSelectionRange(
                            nextCursor,
                            nextCursor,
                        );
                        templateBodyInput.focus();
                        renderTemplateEditorPreview();
                    });
                };
                openTemplatesPopupFromSidebar = async (
                    preloadTemplateId = null,
                ) => {
                    activeTemplateId = null;
                    const isEditing = preloadTemplateId !== null;
                    await openPopup({
                        title: i18n.t("module.social.messages.templates"),
                        body: renderTemplatePopupBody(isEditing),
                        maxWidth: "600px",
                        actions: [
                            {
                                id: "close",
                                label: i18n.t("ui.reuse.close"),
                                variant: "cancel",
                            },
                        ],
                        onOpen: (overlay) => {
                            bindTemplatePopupEvents(overlay);
                            if (isEditing) {
                                editTemplateById(preloadTemplateId);
                            } else if (
                                templateTitleInput instanceof HTMLInputElement
                            ) {
                                templateTitleInput.focus();
                            }
                        },
                    });
                };
                const syncComposerMode = () => {
                    const isComposeMode = composerMode === "compose";
                    const isPreviewMode = composerMode === "preview";
                    if (composerComposeToggle instanceof HTMLButtonElement) {
                        composerComposeToggle.setAttribute(
                            "aria-pressed",
                            String(isComposeMode),
                        );
                    }
                    if (composerPreviewToggle instanceof HTMLButtonElement) {
                        composerPreviewToggle.setAttribute(
                            "aria-pressed",
                            String(isPreviewMode),
                        );
                    }
                    if (composerComposePane instanceof HTMLElement) {
                        composerComposePane.hidden = !isComposeMode;
                    }
                    if (composerInput instanceof HTMLTextAreaElement) {
                        composerInput.hidden = !isComposeMode;
                    }
                    if (composerSendButton instanceof HTMLButtonElement) {
                        composerSendButton.hidden = !isComposeMode;
                    }
                    if (composerPreviewPane instanceof HTMLElement) {
                        composerPreviewPane.hidden = !isPreviewMode;
                    }
                };
                renderComposerPreview();
                syncComposerMode();

                threadList?.addEventListener(
                    "click",
                    async (clickEvent) => {
                        hideReactionHoverPopup();
                        hideReadReceiptHoverPopup();
                        const moreButton = clickEvent.target.closest(
                            "[data-reaction-more]",
                        );
                        if (moreButton) {
                            const messageId =
                                moreButton.getAttribute("data-message-id");
                            if (messageId)
                                await openEmojiPickerPopup(messageId);
                            return;
                        }
                        const reactionDetailsButton = clickEvent.target.closest(
                            "[data-reaction-details]",
                        );
                        if (reactionDetailsButton instanceof HTMLElement) {
                            const rawDetailsPayload =
                                reactionDetailsButton.getAttribute(
                                    "data-reaction-details-payload",
                                ) ?? "[]";
                            const parsedDetails =
                                parseEncodedPayload(rawDetailsPayload);
                            await openReactionDetailsPopup(parsedDetails, i18n);
                            return;
                        }
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
                            recordEmojiUsage(
                                reactionButton.getAttribute("data-emoji"),
                            );
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
                        const beforeTime =
                            button.getAttribute("data-before-time");
                        if (!beforeTime) return;
                        const selectedRoom = rooms.find(
                            (room) =>
                                String(room.id) === String(selectedRoomId),
                        );
                        const key = await resolveThreadRoomKey(
                            selectedRoom,
                            selectedRoomId,
                        );
                        await renderThread(
                            selectedRoomId,
                            key,
                            threadList,
                            i18n,
                            currentAccountId,
                            beforeTime,
                        );
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "mouseover",
                    (mouseEvent) => {
                        const hoveredElement = mouseEvent.target;
                        if (!(hoveredElement instanceof Element)) return;
                        const reactionChipButton = hoveredElement.closest(
                            ".messages-reaction-chip",
                        );
                        if (
                            !(reactionChipButton instanceof HTMLButtonElement)
                        ) {
                            return;
                        }
                        const relatedElement = mouseEvent.relatedTarget;
                        if (
                            relatedElement instanceof Element &&
                            reactionChipButton.contains(relatedElement)
                        ) {
                            return;
                        }
                        showReactionHoverPopup(reactionChipButton);
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "mouseout",
                    (mouseEvent) => {
                        const originElement = mouseEvent.target;
                        if (!(originElement instanceof Element)) return;
                        const reactionChipButton = originElement.closest(
                            ".messages-reaction-chip",
                        );
                        if (
                            !(reactionChipButton instanceof HTMLButtonElement)
                        ) {
                            return;
                        }
                        const relatedElement = mouseEvent.relatedTarget;
                        if (
                            relatedElement instanceof Element &&
                            reactionChipButton.contains(relatedElement)
                        ) {
                            return;
                        }
                        hideReactionHoverPopup();
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "focusin",
                    (focusEvent) => {
                        const focusedElement = focusEvent.target;
                        if (!(focusedElement instanceof Element)) return;
                        const reactionChipButton = focusedElement.closest(
                            ".messages-reaction-chip",
                        );
                        if (
                            !(reactionChipButton instanceof HTMLButtonElement)
                        ) {
                            return;
                        }
                        showReactionHoverPopup(reactionChipButton);
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "focusout",
                    (focusEvent) => {
                        const blurredElement = focusEvent.target;
                        if (!(blurredElement instanceof Element)) return;
                        const reactionChipButton = blurredElement.closest(
                            ".messages-reaction-chip",
                        );
                        if (
                            !(reactionChipButton instanceof HTMLButtonElement)
                        ) {
                            return;
                        }
                        const nextFocusedElement = focusEvent.relatedTarget;
                        if (
                            nextFocusedElement instanceof Element &&
                            reactionChipButton.contains(nextFocusedElement)
                        ) {
                            return;
                        }
                        hideReactionHoverPopup();
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "scroll",
                    hideReactionHoverPopup,
                    passiveEventOptions,
                );
                window.addEventListener(
                    "resize",
                    () => {
                        reactionHoverPopup.reposition();
                    },
                    {
                        signal,
                    },
                );

                threadList?.addEventListener(
                    "mouseover",
                    (mouseEvent) => {
                        const hoveredElement = mouseEvent.target;
                        if (!(hoveredElement instanceof Element)) return;
                        const statusElement = hoveredElement.closest(
                            ".messages-message-status--read",
                        );
                        if (!(statusElement instanceof HTMLElement)) return;
                        const relatedElement = mouseEvent.relatedTarget;
                        if (
                            relatedElement instanceof Element &&
                            statusElement.contains(relatedElement)
                        ) {
                            return;
                        }
                        const rawReaders =
                            statusElement.getAttribute("data-readers") ?? "[]";
                        const readers = parseEncodedPayload(rawReaders);
                        showReadReceiptHoverPopup(statusElement, readers, i18n);
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "mouseout",
                    (mouseEvent) => {
                        const originElement = mouseEvent.target;
                        if (!(originElement instanceof Element)) return;
                        const statusElement = originElement.closest(
                            ".messages-message-status--read",
                        );
                        if (!(statusElement instanceof HTMLElement)) return;
                        const relatedElement = mouseEvent.relatedTarget;
                        if (
                            relatedElement instanceof Element &&
                            statusElement.contains(relatedElement)
                        ) {
                            return;
                        }
                        hideReadReceiptHoverPopup();
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "focusin",
                    (focusEvent) => {
                        const focusedElement = focusEvent.target;
                        if (!(focusedElement instanceof Element)) return;
                        const statusElement = focusedElement.closest(
                            ".messages-message-status--read",
                        );
                        if (!(statusElement instanceof HTMLElement)) return;
                        const rawReaders =
                            statusElement.getAttribute("data-readers") ?? "[]";
                        const readers = parseEncodedPayload(rawReaders);
                        showReadReceiptHoverPopup(statusElement, readers, i18n);
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "focusout",
                    (focusEvent) => {
                        const blurredElement = focusEvent.target;
                        if (!(blurredElement instanceof Element)) return;
                        const statusElement = blurredElement.closest(
                            ".messages-message-status--read",
                        );
                        if (!(statusElement instanceof HTMLElement)) return;
                        const nextFocusedElement = focusEvent.relatedTarget;
                        if (
                            nextFocusedElement instanceof Element &&
                            statusElement.contains(nextFocusedElement)
                        ) {
                            return;
                        }
                        hideReadReceiptHoverPopup();
                    },
                    passiveEventOptions,
                );

                threadList?.addEventListener(
                    "scroll",
                    hideReadReceiptHoverPopup,
                    passiveEventOptions,
                );

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
                    const text = resolveMessageTemplateVariables(
                        input?.value ?? "",
                        currentRoom,
                        currentAccountId,
                    ).trim();
                    if (!text) return;
                    queueTypingUpdate(false);
                    let key = null;
                    try {
                        key = await requireRoomKey(selectedRoomId);
                    } catch (error) {
                        console.error(
                            "[messages] requireRoomKey failed",
                            error,
                        );
                        key = null;
                    }
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
                    renderComposerPreview();
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

                composerInput?.addEventListener("input", () => {
                    const hasText = Boolean((composerInput.value ?? "").trim());
                    queueTypingUpdate(hasText);
                    renderComposerPreview();
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
                composerComposeToggle?.addEventListener("click", () => {
                    if (composerInput?.disabled) return;
                    composerMode = "compose";
                    syncComposerMode();
                });
                composerPreviewToggle?.addEventListener("click", () => {
                    if (composerInput?.disabled) return;
                    composerMode = "preview";
                    syncComposerMode();
                    renderComposerPreview();
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
            hideReactionHoverPopup();
            hideReadReceiptHoverPopup();
            reactionHoverPopup.destroy();
            readReceiptHoverPopup.destroy();
            openTemplatesPopupFromSidebar = null;
            if (typingSendTimeoutId) clearTimeout(typingSendTimeoutId);
            if (typingPollIntervalId) clearInterval(typingPollIntervalId);
            if (liveRefreshIntervalId) clearInterval(liveRefreshIntervalId);
        },
        { once: true },
    );

    function bindSidebarEvents() {
        const roomsList = document.getElementById("messages-rooms-list");
        if (roomsList) void hydrateProfileAvatars(roomsList);
        roomsList?.addEventListener("click", async (clickEvent) => {
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

        const templatesBtn = document.getElementById(
            "messages-open-templates-btn",
        );
        templatesBtn?.addEventListener("click", () => {
            void openTemplatesPopupFromSidebar?.();
        });

        const sidebarTemplateList = document.getElementById(
            "messages-sidebar-template-list",
        );
        sidebarTemplateList?.addEventListener("click", async (clickEvent) => {
            const actionButton = clickEvent.target.closest(
                "[data-template-action]",
            );
            if (!(actionButton instanceof HTMLButtonElement)) return;
            const templateId = actionButton.dataset.templateId;
            if (!templateId) return;
            const action = actionButton.dataset.templateAction;
            if (action === "use") {
                const templateRecord = savedMessageTemplates.find(
                    (entry) => String(entry.id) === String(templateId),
                );
                if (!templateRecord) return;
                const composerInput = document.getElementById(
                    "messages-composer-input",
                );
                if (composerInput instanceof HTMLTextAreaElement) {
                    composerInput.value = templateRecord.content;
                    composerInput.dispatchEvent(new Event("input"));
                }
                return;
            }
            if (action === "edit") {
                void openTemplatesPopupFromSidebar?.(templateId);
                return;
            }
            if (action !== "delete") return;
            const templateRecord = savedMessageTemplates.find(
                (entry) => String(entry.id) === String(templateId),
            );
            if (!templateRecord) return;
            const escapedTemplateTitle = escapeHtml(templateRecord.title);
            const deleteConfirmBodyTemplate = i18n
                .t("module.social.messages.template_delete_confirm_body")
                .replace("{name}", "{templateName}");
            const deleteConfirmBody = escapeHtml(
                deleteConfirmBodyTemplate,
            ).replace("{templateName}", escapedTemplateTitle);
            const deleteResult = await openPopup({
                title: i18n.t(
                    "module.social.messages.template_delete_confirm_title",
                ),
                body: deleteConfirmBody,
                variant: "danger",
                actions: [
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "cancel",
                    },
                    {
                        id: "confirm",
                        label: i18n.t("module.social.messages.template_delete"),
                        variant: "confirm",
                    },
                ],
            });
            if (deleteResult !== "confirm") return;
            savedMessageTemplates = savedMessageTemplates.filter(
                (entry) => String(entry.id) !== String(templateId),
            );
            persistSavedMessageTemplates(savedMessageTemplates);
            renderSidebarTemplateList();
            showToast(i18n.t("module.social.messages.template_deleted"), {
                variant: "success",
            });
        });

        renderSidebarTemplateList();
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

await mountWhenDirect(mount);
