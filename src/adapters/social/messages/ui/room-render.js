import {
    buildProfileAvatarMarkup,
    isProfileAvatarUnavailable,
} from "/static/gateways/social/reuse/profile-avatar.js";
import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { resolveMemberDisplayName } from "/static/reuse/member-display-name.js";
import { stableJson } from "./message-utils.js";

export function messageRenderSignature(messages, pendingRequest) {
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

export function roomListRenderSignature(rooms, selectedRoomId) {
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

export function profileHref(handle) {
    if (!handle) return "";
    return `/profile/${encodeURIComponent(String(handle).replace(/^@/, ""))}`;
}

export function selectedRoomTitle(room, currentAccountId) {
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

function randomRank() {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0];
}

function randomSample(values, count) {
    return values
        .map((value) => ({ value, rank: randomRank() }))
        .sort((entryA, entryB) => entryA.rank - entryB.rank)
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
        while (picked.length < 4) {
            picked.push({ handle: "", displayName: "" });
        }
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

export function renderThreadHeader(room, currentAccountId, i18n) {
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

export function renderRoomList({
    rooms,
    currentAccountId,
    selectedRoomId,
    i18n,
    formatRoomListAvatar,
}) {
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
          <li class="messages-room ${isActive ? "messages-room--active" : ""}${archivedClass}" data-chat-id="${escapeHtml(room.id)}" data-search-label="${escapeHtml(titleSource)}" data-search-text="${escapeHtml(`${titleSource} ${preview}`)}">
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
