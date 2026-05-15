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
import { showToast } from "/static/reuse/toast.js";
import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { normalizeMessageStyle } from "/static/reuse/message-style-options.js";
import {
    hexToBytes,
    bytesToHex,
    importRoomKey,
} from "/static/reuse/crypto-utils.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const QUICK_REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉"];
const TYPING_TTL_SECONDS = 8;
const TYPING_IDLE_RESET_MS = (TYPING_TTL_SECONDS - 3) * 1000;
const TYPING_SEND_DEBOUNCE_MS = 1200;
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

async function encryptMessage(key, plaintext) {
    const initVector = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: initVector },
        key,
        textEncoder.encode(plaintext),
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
        return textDecoder.decode(decrypted);
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
    if (room.avatarKey) {
        return `<div class="messages-thread-avatar"><img class="messages-thread-avatar-img" src="/api/v1/files/${escapeHtml(room.avatarKey)}" alt="" /></div>`;
    }
    const members = room.members ?? [];
    if (room.kind === "classroom") {
        const picked = randomSample(members, 4);
        while (picked.length < 4) picked.push({ handle: "", displayName: "" });
        return `<div class="messages-classroom-collage">${picked.map(renderMemberInitials).join("")}</div>`;
    }
    const other =
        members.find((member) => member.accountId !== currentAccountId) ??
        members[0];
    const label = other ? memberDisplayName(other) : room.title || room.id;
    const color = pickInitialsColor(other?.handle || other?.accountId || label);
    return `<div class="messages-thread-avatar"><span class="messages-thread-initials" style="--initials-bg: ${escapeHtml(color)};">${escapeHtml(getInitialsText(label))}</span></div>`;
}

function renderThreadHeader(room, currentAccountId, i18n) {
    if (!room) return "";
    const members = room.members ?? [];
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
                <span class="messages-thread-subtitle">${escapeHtml(String(members.length))} ${escapeHtml(i18n.t("module.social.messages.members"))}</span>
            </div>
            ${canSetAvatar ? `<label class="messages-room-avatar-btn">${escapeHtml(i18n.t("module.social.messages.set_avatar"))}<input id="messages-room-avatar-input" type="file" accept="image/*" hidden /></label>` : ""}
        </header>
    `;
}

function renderRoomList(rooms, currentAccountId, selectedRoomId, i18n) {
    if (!rooms.length) {
        return `<div class="messages-empty">${escapeHtml(i18n.t("module.social.messages.empty"))}</div>`;
    }
    return rooms
        .map((room) => {
            const titleSource = selectedRoomTitle(room, currentAccountId);
            const members = Array.isArray(room.members) ? room.members : [];
            const preferredOtherMember = members.find(
                (member) => member.accountId !== currentAccountId,
            );
            const displayedMember = preferredOtherMember ?? members[0] ?? null;
            const avatar = displayedMember?.avatarKey
                ? `<img class="messages-room-avatar-img" src="/api/v1/files/${escapeHtml(displayedMember.avatarKey)}" alt="" />`
                : `<span class="messages-room-avatar-fallback" style="--initials-bg: ${escapeHtml(pickInitialsColor(displayedMember?.handle || displayedMember?.accountId || titleSource))};">${escapeHtml(getInitialsText(displayedMember ? memberDisplayName(displayedMember) : titleSource))}</span>`;
            const previewSource =
                room.lastMessagePreview ||
                room.lastMessage?.senderDisplayName ||
                room.lastMessage?.senderHandle ||
                i18n.t("module.social.messages.preview_encrypted");
            const preview = String(previewSource).replace(/\s+/g, " ").trim();
            const unreadBadge =
                room.unread > 0
                    ? `<span class="messages-unread-badge">${escapeHtml(String(room.unread))}</span>`
                    : "";
            const isActive = room.id === selectedRoomId;
            const pendingRequest = room.pendingRequest ?? null;
            const canRespondInSidebar =
                pendingRequest &&
                pendingRequest.direction === "incoming" &&
                pendingRequest.canRespond &&
                pendingRequest.id;
            const pendingClass = canRespondInSidebar
                ? " messages-room--pending"
                : "";
            const pendingActions = canRespondInSidebar
                ? `<span class="messages-room-request-actions" data-request-id="${escapeHtml(pendingRequest.id)}">
                    <button type="button" class="messages-room-request-approve" aria-label="${escapeHtml(i18n.t("module.social.messages.approve_request"))}">✅</button>
                    <button type="button" class="messages-room-request-reject" aria-label="${escapeHtml(i18n.t("module.social.messages.reject_request"))}">❌</button>
                </span>`
                : "";
            return `
      <li class="messages-room ${isActive ? "messages-room--active" : ""}${pendingClass}"
          data-room-id="${escapeHtml(room.id)}">
        <span class="messages-room-avatar">${avatar}</span>
        <span class="messages-room-meta">
            <span class="messages-room-title">${escapeHtml(titleSource)}</span>
            <span class="messages-room-preview">${escapeHtml(preview)}</span>
        </span>
        ${unreadBadge}
        ${pendingActions}
      </li>
    `;
        })
        .join("");
}

function renderStatusIndicator(message, currentAccountId, i18n) {
    if (message.senderId !== currentAccountId) return "";
    const readers = Array.isArray(message.readBy) ? message.readBy : [];
    const readCount = readers.length;
    const deliveredCount = Number(message.deliveredToCount ?? 0);
    const hasDelivered = readCount > 0 || deliveredCount > 0;
    const isRead = readCount > 0;
    const solidClass = isRead ? " messages-status-tick--solid" : "";

    const tooltipRows = readers
        .map((reader) => {
            const readerName =
                reader.displayName || reader.handle || reader.accountId;
            const readTime = reader.readAt
                ? formatDateTime(reader.readAt)
                : "—";
            return `<li>${escapeHtml(readerName)} — ${escapeHtml(readTime)}</li>`;
        })
        .join("");
    const tooltip = readers.length
        ? `<div class="messages-read-tooltip" hidden role="tooltip"><ul>${tooltipRows}</ul></div>`
        : "";

    return `<div class="messages-status-group" data-status-for="${escapeHtml(message.id)}" role="button" tabindex="0" aria-label="${escapeHtml(i18n.t("module.social.messages.read_details"))}">
        <span class="messages-status-tick${solidClass}" aria-hidden="true">✓</span>${hasDelivered ? `<span class="messages-status-tick${solidClass}" aria-hidden="true">✓</span>` : ""}${tooltip}
    </div>`;
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
    const reactions = Array.isArray(message.reactions) ? message.reactions : [];
    const chips = reactions
        .map((reaction) => {
            const ownClass = reaction.reactedByMe
                ? " messages-reaction-chip--active"
                : "";
            return `<button type="button" class="messages-reaction-chip${ownClass}" data-message-id="${escapeHtml(message.id)}" data-emoji="${escapeHtml(reaction.emoji)}">${escapeHtml(reaction.emoji)} <span>${escapeHtml(String(reaction.count))}</span></button>`;
        })
        .join("");
    const quick = QUICK_REACTION_EMOJIS.map(
        (emoji) =>
            `<button type="button" class="messages-reaction-add-btn" data-message-id="${escapeHtml(message.id)}" data-emoji="${escapeHtml(emoji)}">${escapeHtml(emoji)}</button>`,
    ).join("");
    return `<div class="messages-reactions-row">${chips}<span class="messages-reaction-add-wrap">${quick}</span></div>`;
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
    const html = decoded
        .map((msg) => {
            const roomEventLabel = formatRoomEventText(msg, i18n);
            if (roomEventLabel) {
                return `<div class="messages-room-event">${escapeHtml(roomEventLabel)}</div>`;
            }
            const isOwn = msg.senderId === currentAccountId;
            const ownClass = isOwn ? " messages-message--own" : "";
            const senderLabel = isOwn
                ? ""
                : `<span class="messages-message-sender">${escapeHtml(msg.senderDisplayName || msg.senderHandle || msg.senderId)}</span>`;
            const timeLabel = msg.createdAt
                ? `<time class="messages-message-time" datetime="${escapeHtml(msg.createdAt)}">${escapeHtml(formatDateTime(msg.createdAt))}</time>`
                : "";
            const statusIndicator = renderStatusIndicator(
                msg,
                currentAccountId,
                i18n,
            );
            const metadataRow =
                timeLabel || statusIndicator
                    ? `<div class="messages-message-meta">${timeLabel}${statusIndicator}</div>`
                    : "";
            return `<div class="messages-message${ownClass}" data-message-id="${escapeHtml(msg.id)}">
            ${senderLabel}
            <span class="messages-message-body">${escapeHtml(msg.text ?? "…")}</span>
            ${metadataRow}
            ${renderReactionRow(msg)}
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
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
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
    const i18n = await createI18n();
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
        await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/read`,
            { method: "POST" },
        ).catch(() => undefined);
        bindPendingRequestBannerEvents();
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
        const res = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(selectedRoomId)}/messages/${encodeURIComponent(messageId)}/reactions`,
            {
                method: "POST",
                body: JSON.stringify({ emoji }),
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
            typingStatusEl.textContent = "";
            return;
        }
        const payload = await res.json();
        const typers = payload?.data ?? [];
        if (!typers.length) {
            typingStatusEl.textContent = "";
            return;
        }
        const names = typers
            .slice(0, 2)
            .map(
                (typer) => typer.displayName || typer.handle || typer.accountId,
            )
            .join(", ");
        typingStatusEl.textContent = `${names} ${i18n.t("module.social.messages.typing")}`;
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
    }

    async function reloadRoomsList() {
        rooms = await loadRooms(i18n);
        const roomsList = document.getElementById("messages-rooms-list");
        if (roomsList) {
            roomsList.innerHTML = renderRoomList(
                rooms,
                currentAccountId,
                selectedRoomId,
                i18n,
            );
        }
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

                function closeReadTooltips() {
                    threadList
                        ?.querySelectorAll(".messages-read-tooltip")
                        .forEach((node) => node.setAttribute("hidden", ""));
                    threadList?.classList.remove(
                        "messages-thread-list--receipt-open",
                    );
                }

                threadList?.addEventListener("click", async (clickEvent) => {
                    const statusGroup =
                        clickEvent.target.closest("[data-status-for]");
                    if (statusGroup) {
                        const tooltip = statusGroup.querySelector(
                            ".messages-read-tooltip",
                        );
                        if (!tooltip) return;
                        const isHidden = tooltip.hasAttribute("hidden");
                        closeReadTooltips();
                        if (isHidden) {
                            tooltip.removeAttribute("hidden");
                            threadList.classList.add(
                                "messages-thread-list--receipt-open",
                            );
                        }
                        return;
                    }
                    if (
                        threadList.querySelector(
                            ".messages-read-tooltip:not([hidden])",
                        )
                    ) {
                        closeReadTooltips();
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
                    if (!res.ok) return;
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

                threadList?.addEventListener("keydown", (keyboardEvent) => {
                    if (
                        keyboardEvent.key !== "Enter" &&
                        keyboardEvent.key !== " "
                    ) {
                        return;
                    }
                    const statusGroup =
                        keyboardEvent.target.closest("[data-status-for]");
                    if (!statusGroup) return;
                    keyboardEvent.preventDefault();
                    const tooltip = statusGroup.querySelector(
                        ".messages-read-tooltip",
                    );
                    if (!tooltip) return;
                    const isHidden = tooltip.hasAttribute("hidden");
                    closeReadTooltips();
                    if (isHidden) {
                        tooltip.removeAttribute("hidden");
                        threadList.classList.add(
                            "messages-thread-list--receipt-open",
                        );
                    }
                });

                if (selectedRoomId) {
                    void openRoom(selectedRoomId);
                    void refreshTypingIndicator();
                    startTypingPolling();
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
            }
        },
        { signal },
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            startTypingPolling();
            if (document.visibilityState === "visible") {
                void refreshTypingIndicator();
            }
        },
        { signal },
    );

    document.addEventListener(
        "click",
        (clickEvent) => {
            if (
                !(clickEvent.target instanceof Element) ||
                clickEvent.target.closest("[data-status-for]")
            ) {
                return;
            }
            document
                .querySelectorAll(".messages-read-tooltip:not([hidden])")
                .forEach((tooltip) => tooltip.setAttribute("hidden", ""));
            document
                .querySelectorAll(".messages-thread-list--receipt-open")
                .forEach((thread) =>
                    thread.classList.remove(
                        "messages-thread-list--receipt-open",
                    ),
                );
        },
        { signal },
    );

    signal?.addEventListener(
        "abort",
        () => {
            if (typingSendTimeoutId) clearTimeout(typingSendTimeoutId);
            if (typingPollIntervalId) clearInterval(typingPollIntervalId);
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
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
