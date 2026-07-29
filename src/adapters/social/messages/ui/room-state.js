import {
    handleProfileAvatarError,
    hydrateProfileAvatars,
} from "/static/gateways/social/reuse/profile-avatar.js";
import { apiFetch } from "/static/reuse/api-client.js";
import {
    MESSAGES_FILE_NAMESPACE_ID,
    buildNamespacedFileUrl,
} from "./file-namespaces.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { loadAllEmojis, recordEmojiUsage } from "./emoji-helpers.js";
import {
    destroyMessageHoverPopups,
    formatRoomListAvatar,
    hideAllMessageHoverPopups,
    loadRooms,
    renderMemberSummaryBody,
    renderThread,
} from "./message-render.js";
import { normalizeReactionEmoji } from "./message-utils.js";
import {
    roomListRenderSignature,
    renderRoomList,
    renderThreadHeader,
} from "./room-render.js";

export function createMessagesRoomState({
    i18n,
    currentAccountId,
    initialSelectedRoomId = null,
    getRoomKey,
    requireRoomKey,
    resolveThreadRoomKey,
    acceptRoomKeyContribution = async () => true,
    onRoomOpened = async () => {},
    lastOpenedRoomKey = "messages:last-opened-room",
    typingTtlSeconds = 8,
    typingIdleResetMs = 5000,
    typingSendDebounceMs = 1200,
    liveRefreshIntervalMs = 2500,
}) {
    let rooms = [];
    let selectedRoomId = initialSelectedRoomId;
    let typingSendTimeoutId = null;
    let typingPollIntervalId = null;
    let liveRefreshIntervalId = null;
    let lastRoomsListRenderSignature = null;
    let pendingBannerSlotElement = null;
    let typingActive = false;
    let lastTypingSentAt = 0;
    let openingRoomId = null;
    let roomOpenPromise = null;
    let readyRoomId = null;

    async function loadInitialRooms() {
        rooms = await loadRooms(i18n, { getRoomKey });
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
        return rooms;
    }

    async function loadRoom(roomId) {
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}`,
        );
        if (!response.ok) return null;
        return (await response.json()).data ?? null;
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

    function getPendingRequestSignature(pendingRequest) {
        if (!pendingRequest) return "";
        return [
            pendingRequest.id ?? "",
            pendingRequest.direction ?? "",
            String(Boolean(pendingRequest.canRespond)),
        ].join(":");
    }

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

    async function performOpenRoom(roomId) {
        const threadList = document.getElementById("messages-thread-list");
        const headerSlot = document.getElementById(
            "messages-thread-header-slot",
        );
        if (!threadList) return;
        selectedRoomId = roomId;
        readyRoomId = null;
        localStorage.setItem(lastOpenedRoomKey, roomId);
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
        if (
            room?.keyContribution &&
            !(await acceptRoomKeyContribution(room.id, room.keyContribution))
        ) {
            threadList.textContent = i18n.t(
                "adapter.social.messages.keyring_unlock_required",
            );
            return;
        }
        await onRoomOpened(room ?? null);
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
        readyRoomId = roomId;
    }

    function openRoom(roomId) {
        if (openingRoomId === roomId && roomOpenPromise) {
            return roomOpenPromise;
        }
        openingRoomId = roomId;
        const pendingOpen = performOpenRoom(roomId);
        const trackedOpen = pendingOpen.finally(() => {
            if (roomOpenPromise === trackedOpen) {
                openingRoomId = null;
                roomOpenPromise = null;
            }
        });
        roomOpenPromise = trackedOpen;
        return roomOpenPromise;
    }

    function renderRoomsListIntoDom({ force = false } = {}) {
        const roomsList = document.getElementById("messages-rooms-list");
        if (!roomsList) return;
        const renderSignature = roomListRenderSignature(rooms, selectedRoomId);
        if (!force && lastRoomsListRenderSignature === renderSignature) return;
        roomsList.innerHTML = renderRoomList({
            rooms,
            currentAccountId,
            selectedRoomId,
            i18n,
            formatRoomListAvatar,
        });
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
            `/api/v1/social/messages/rooms/${encodeURIComponent(selectedRoomId)}/read`,
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
        const response = await apiFetch(
            `/api/v1/social/messages/requests/${encodeURIComponent(requestId)}/${action}`,
            { method: "POST" },
        ).catch((error) => {
            console.error("[messages] pending-request action failed", {
                action,
                requestId,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        });
        if (!response) {
            showToast(i18n.t("module.social.messages.request_action_failed"), {
                variant: "error",
            });
            return;
        }
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
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
        await openFallbackAfterRoomRemoval(roomIdHint || selectedRoomId);
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
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(selectedRoomId)}/messages/${encodeURIComponent(messageId)}/reactions`,
            {
                method: "POST",
                body: JSON.stringify({ emoji: normalizedEmoji }),
            },
        );
        if (!response.ok) return;
        const threadList = document.getElementById("messages-thread-list");
        if (!threadList) return;
        const selectedRoom = getSelectedRoom();
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
                .slice(0, 80)
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
                    const button = event.target.closest(
                        ".messages-emoji-picker-btn",
                    );
                    if (!(button instanceof HTMLButtonElement)) return;
                    const chosenEmoji = button.dataset.emoji;
                    overlay.querySelector("[data-popup-action]")?.click();
                    recordEmojiUsage(
                        apiFetch,
                        chosenEmoji,
                        normalizeReactionEmoji,
                    );
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
        if (readyRoomId !== selectedRoomId) return;
        await reloadRoomsList();
        const threadList = document.getElementById("messages-thread-list");
        if (!threadList) return;
        const selectedRoom = getSelectedRoom();
        const key = await getRoomKey(selectedRoomId);
        if (!key && !selectedRoom?.pendingRequest) return;
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
        }, liveRefreshIntervalMs);
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
            now - lastTypingSentAt < typingSendDebounceMs
        ) {
            typingSendTimeoutId = setTimeout(() => {
                queueTypingUpdate(false);
            }, typingIdleResetMs);
            return;
        }
        if (!typing && !typingActive) return;
        typingActive = typing;
        lastTypingSentAt = now;
        void apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(selectedRoomId)}/typing`,
            {
                method: "POST",
                body: JSON.stringify({
                    typing,
                    ttlSeconds: typingTtlSeconds,
                }),
            },
        ).catch(() => undefined);
        if (typing) {
            typingSendTimeoutId = setTimeout(() => {
                queueTypingUpdate(false);
            }, typingIdleResetMs);
        }
    }

    async function refreshTypingIndicator() {
        if (!selectedRoomId) return;
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(selectedRoomId)}/typing`,
        );
        const typingStatusElement = document.getElementById(
            "messages-typing-status",
        );
        if (!typingStatusElement) return;
        if (!response.ok) {
            typingStatusElement.innerHTML = "";
            return;
        }
        const payload = await response.json();
        const typers = payload?.data ?? [];
        if (!typers.length) {
            typingStatusElement.innerHTML = "";
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
        typingStatusElement.innerHTML = `<span class="messages-typing-indicator" aria-hidden="true"><span></span><span></span><span></span></span><span class="messages-typing-label">${escapeHtml(typingLabel)}</span>`;
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
            const extension = extensionFromType(file.type);
            const key = `chatrooms/${selectedRoomId}-${Date.now()}.${extension}`;
            const buffer = await file.arrayBuffer();
            const upload = await apiFetch(
                buildNamespacedFileUrl(MESSAGES_FILE_NAMESPACE_ID, key),
                {
                    method: "PUT",
                    headers: { "content-type": file.type || "image/jpeg" },
                    body: buffer,
                },
            );
            if (!upload.ok) return;
            const update = await apiFetch(
                `/api/v1/social/messages/rooms/${encodeURIComponent(selectedRoomId)}`,
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
            const selectedRoom = getSelectedRoom();
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
        rooms = await loadRooms(i18n, { getRoomKey });
        const selectedRoom = getSelectedRoom();
        syncComposerAvailability(selectedRoom ?? null);
        renderRoomsListIntoDom();
    }

    async function openFallbackAfterRoomRemoval(removedRoomId) {
        const fallbackRoom = rooms.find(
            (room) => String(room.id) !== String(removedRoomId),
        );
        if (!fallbackRoom) {
            selectedRoomId = null;
            history.replaceState({}, "", "/messages");
            for (const elementId of [
                "messages-thread-header-slot",
                "messages-request-banner-slot",
                "messages-typing-status",
                "messages-thread-list",
            ]) {
                const element = document.getElementById(elementId);
                if (element) element.innerHTML = "";
            }
            syncComposerAvailability(null);
            return;
        }
        selectedRoomId = fallbackRoom.id;
        history.replaceState(
            {},
            "",
            `/messages/${encodeURIComponent(fallbackRoom.id)}`,
        );
        await openRoom(fallbackRoom.id);
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
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomIdToLeave)}/members/${encodeURIComponent(handle)}`,
            { method: "DELETE" },
        );
        if (!response.ok) {
            showToast(i18n.t("module.social.messages.leave_failed"), {
                variant: "error",
            });
            return;
        }
        await reloadRoomsList();
        await openFallbackAfterRoomRemoval(roomIdToLeave);
        await refreshTypingIndicator();
        startTypingPolling();
        startLiveRefreshPolling();
    }

    const pendingConversationHandles = new Set();

    async function createConversationFromHandle(handle) {
        const normalizedHandle = String(handle ?? "")
            .trim()
            .toLowerCase();
        if (
            !normalizedHandle ||
            pendingConversationHandles.has(normalizedHandle)
        ) {
            return;
        }
        pendingConversationHandles.add(normalizedHandle);
        try {
            const createResponse = await apiFetch(
                "/api/v1/social/messages/rooms",
                {
                    method: "POST",
                    body: JSON.stringify({ handles: [handle] }),
                },
            );
            if (!createResponse.ok) {
                const errorPayload = await createResponse
                    .json()
                    .catch(() => null);
                const code = errorPayload?.error?.code;
                const toastKey =
                    code === "forbidden"
                        ? "module.social.messages.start_failed_forbidden"
                        : "module.social.messages.start_failed";
                showToast(i18n.t(toastKey), { variant: "error" });
                return;
            }
            const createPayload = await createResponse.json();
            const newRoomId = createPayload?.data?.id;
            if (createPayload?.data?.requiresApproval) {
                showToast(i18n.t("module.social.messages.request_sent"), {
                    variant: "info",
                });
                await reloadRoomsList();
                return;
            }
            if (!newRoomId) return;
            selectedRoomId = newRoomId;
            history.pushState(
                {},
                "",
                `/messages/${encodeURIComponent(newRoomId)}`,
            );
            await openRoom(newRoomId);
            await reloadRoomsList();
        } finally {
            pendingConversationHandles.delete(normalizedHandle);
        }
    }

    function cleanup() {
        hideAllMessageHoverPopups();
        destroyMessageHoverPopups();
        if (typingSendTimeoutId) clearTimeout(typingSendTimeoutId);
        if (typingPollIntervalId) clearInterval(typingPollIntervalId);
        if (liveRefreshIntervalId) clearInterval(liveRefreshIntervalId);
    }

    function getSelectedRoom() {
        return rooms.find((room) => String(room.id) === String(selectedRoomId));
    }

    return {
        cleanup,
        createConversationFromHandle,
        getRooms: () => rooms,
        getSelectedRoom,
        getSelectedRoomId: () => selectedRoomId,
        loadInitialRooms,
        markSelectedRoomRead,
        openEmojiPickerPopup,
        openRoom,
        queueTypingUpdate,
        refreshActiveConversation,
        refreshTypingIndicator,
        reloadRoomsList,
        renderRoomsListIntoDom,
        setSelectedRoomId: (roomId) => {
            selectedRoomId = roomId;
        },
        startLiveRefreshPolling,
        startTypingPolling,
        toggleReaction,
    };
}
