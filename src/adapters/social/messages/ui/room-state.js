import { createBackgroundRefresh } from "./reuse/background-refresh.js";
import { createTypingState } from "./typing-state.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { createReadAcknowledgements } from "./read-state.js";
import { createThreadActions } from "./thread-actions.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { canOpenCachedRoom, selectInitialRoomId } from "./offline-room.js";
import { messagesFetch as apiFetch } from "./offline-client.js";
import {
    MESSAGES_FILE_NAMESPACE_ID,
    buildNamespacedFileUrl,
} from "./file-namespaces.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
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
    renderPendingRequestBanner,
    getPendingRequestSignature,
} from "./room-render.js";

const profileAvatars = () => {
    const capability = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    if (!capability) throw new Error("Profile avatar capability unavailable");
    return capability;
};
const handleProfileAvatarError = (event) => profileAvatars().handleError(event);
const hydrateProfileAvatars = (container) =>
    profileAvatars().hydrate(container);

export function createMessagesRoomState({
    i18n,
    currentAccountId,
    signal,
    onRoomSelected = () => {},
    initialSelectedRoomId = null,
    getRoomKey,
    requireRoomKey,
    resolveThreadRoomKey,
    onRoomOpened = async () => {},
    resolveRoomActions = async () => [],
    onRoomAction = async () => {},
    lastOpenedRoomKey = "messages:last-opened-room",
    typingTtlSeconds = 8,
    typingIdleResetMs = 5000,
    typingSendDebounceMs = 1200,
    liveRefreshIntervalMs = 2500,
}) {
    let rooms = [];
    let selectedRoomId = initialSelectedRoomId;
    let liveRefreshIntervalId = null;
    let lastRoomsListRenderSignature = null;
    let pendingBannerSlotElement = null;
    let openingRoomId = null;
    let roomOpenPromise = null;
    let readyRoomId = null;
    let selectedRoomActions = [];
    let disposed = false;
    let generation = 0;
    let listGeneration = 0;
    let refreshing = null;
    const assertAccount = captureAccountGuard();
    const log = (level, message, context) =>
        console[level](message, {
            component: "social-messages",
            ...context,
        });

    function isActive() {
        if (disposed || signal?.aborted) return false;
        try {
            assertAccount();
            return true;
        } catch {
            log("info", "[messages] account view invalidated", {
                operation: "disposePage",
            });
            cleanup();
            return false;
        }
    }

    function captureRoom() {
        const expected = generation;
        const roomId = selectedRoomId;
        return () =>
            isActive() && generation === expected && selectedRoomId === roomId;
    }

    function setSelectedRoomId(roomId) {
        if (!isActive() || selectedRoomId === roomId) return;
        queueTypingUpdate(false);
        generation += 1;
        selectedRoomId = roomId;
        readyRoomId = null;
    }

    const markRoomRead = createReadAcknowledgements({
        i18n,
        isActive,
        getRooms: () => rooms,
        updateRooms: (updated) => {
            rooms = updated;
            renderRoomsListIntoDom();
        },
    });
    signal?.addEventListener("abort", cleanup, { once: true });

    const typing = createTypingState({
        i18n,
        getSelectedRoomId: () => selectedRoomId,
        captureRoom,
        isEnabled: () => isActive() && !keyringAccessSuppressed(),
        typingTtlSeconds,
        typingIdleResetMs,
        typingSendDebounceMs,
    });
    const {
        queueTypingUpdate,
        refreshTypingIndicator,
        refreshTypingInBackground,
        startTypingPolling,
    } = typing;

    function keyringAccessSuppressed() {
        return (
            uiCtx.capabilities.get("keyring:isAccessSuppressed")?.() === true
        );
    }

    function handleKeyringAccessState(event) {
        if (event.detail?.suppressed === true) {
            typing.cleanup();
            if (liveRefreshIntervalId) clearInterval(liveRefreshIntervalId);
            liveRefreshIntervalId = null;
            return;
        }
        startTypingPolling();
        startLiveRefreshPolling();
    }

    window.addEventListener(
        "cognis:keyring-access-state",
        handleKeyringAccessState,
    );

    async function loadInitialRooms() {
        if (!isActive()) return [];
        const loaded = await loadRooms(i18n, {
            getRoomKey,
            isCurrent: isActive,
        });
        if (!isActive()) return [];
        rooms = loaded;
        const previous = selectedRoomId;
        selectedRoomId = selectInitialRoomId(rooms, selectedRoomId);
        if (selectedRoomId && selectedRoomId !== previous) {
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
        pendingBannerSlot.innerHTML = renderPendingRequestBanner(
            pendingRequest,
            i18n,
        );
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
        if (!isActive()) return;
        if (isOffline() && !canOpenCachedRoom(roomId)) {
            showToast(i18n.t("ui.reuse.offline_no_cached_content"), {
                variant: "info",
            });
            return;
        }
        const threadList = document.getElementById("messages-thread-list");
        const headerSlot = document.getElementById(
            "messages-thread-header-slot",
        );
        if (!threadList) return;
        setSelectedRoomId(roomId);
        generation += 1;
        const isCurrent = captureRoom();
        readyRoomId = null;
        onRoomSelected(roomId);
        syncComposerAvailability(null);
        threadList.innerHTML = "";
        if (headerSlot) headerSlot.innerHTML = "";
        syncPendingRequestBanner(null);
        localStorage.setItem(lastOpenedRoomKey, roomId);
        const room = await loadRoom(roomId);
        if (!isCurrent()) return;
        if (!room) return;

        if (room) {
            rooms = rooms.map((entry) =>
                String(entry.id) === String(room.id)
                    ? { ...entry, ...room }
                    : entry,
            );
        }
        selectedRoomActions = [];
        if (room) {
            try {
                const actions = await resolveRoomActions(room);
                if (!isCurrent()) return;
                selectedRoomActions = actions;
            } catch (error) {
                if (!isCurrent()) return;
                log("error", "[messages] room action check failed", {
                    operation: "resolveRoomActions",
                    roomId,
                    errorName: error.name,
                });
                showToast(i18n.t("ui.reuse.error"), { variant: "error" });
            }
        }
        if (!isCurrent()) return;
        const key = await resolveThreadRoomKey(room, roomId);
        if (!isCurrent()) return;
        if (headerSlot && room) {
            headerSlot.innerHTML = renderThreadHeader(
                room,
                currentAccountId,
                i18n,
                {
                    actions: selectedRoomActions,
                },
            );
            void hydrateProfileAvatars(headerSlot);
            bindRoomHeaderEvents();
        }
        syncComposerAvailability(room);
        syncPendingRequestBanner(room?.pendingRequest ?? null);
        await onRoomOpened(room ?? null);
        if (!isCurrent()) return;
        const threadResult = await renderThread(
            roomId,
            key,
            threadList,
            i18n,
            currentAccountId,
            undefined,
            { force: true, isCurrent, signal },
        );
        if (!isCurrent() || !threadResult) return;
        const resolvedPendingRequest = threadResult.pendingRequest ?? null;
        setSelectedRoomPendingRequest(resolvedPendingRequest);
        syncPendingRequestBanner(resolvedPendingRequest);
        await markRoomRead(roomId, {
            force: true,
            readAt: threadResult.newestCreatedAt,
        });
        if (!isCurrent()) return;
        bindPendingRequestBannerEvents();
        readyRoomId = roomId;
    }

    function openRoom(roomId) {
        if (
            openingRoomId === roomId &&
            roomOpenPromise &&
            selectedRoomId === roomId
        ) {
            return roomOpenPromise;
        }
        openingRoomId = roomId;
        const opening = performOpenRoom(roomId);
        const isCurrent = captureRoom();
        const pendingOpen = opening.catch((error) => {
            if (!isCurrent()) return;
            log("error", "[messages] conversation open failed", {
                operation: "openRoom",
                roomId,
                errorName: error.name,
            });
            showToast(i18n.t("ui.reuse.error"), { variant: "error" });
        });
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

    function markSelectedRoomRead(options) {
        return markRoomRead(selectedRoomId, options);
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

    const { toggleReaction, loadEarlierMessages } = createThreadActions({
        captureRoom,
        getSelectedRoomId: () => selectedRoomId,
        getSelectedRoom,
        resolveThreadRoomKey,
        currentAccountId,
        i18n,
        signal,
    });

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

    function refreshActiveConversation() {
        if (!isActive() || keyringAccessSuppressed()) return Promise.resolve();
        if (!selectedRoomId || document.visibilityState !== "visible")
            return Promise.resolve();
        if (readyRoomId !== selectedRoomId) return Promise.resolve();
        if (refreshing?.generation === generation) return refreshing.promise;
        const isCurrent = captureRoom();
        const roomId = selectedRoomId;
        const promise = (async () => {
            await reloadRoomsList();
            if (!isCurrent()) return;
            const threadList = document.getElementById("messages-thread-list");
            if (!threadList) return;
            const selectedRoom = getSelectedRoom();
            const key = await getRoomKey(roomId);
            if (!isCurrent() || (!key && !selectedRoom?.pendingRequest)) return;
            const threadResult = await renderThread(
                roomId,
                key,
                threadList,
                i18n,
                currentAccountId,
                undefined,
                { isCurrent, signal },
            );
            if (!isCurrent() || !threadResult) return;
            const pendingRequest = threadResult.pendingRequest ?? null;
            setSelectedRoomPendingRequest(pendingRequest);
            syncPendingRequestBanner(pendingRequest);
            if (threadResult.changed || selectedRoomHasUnread())
                await markRoomRead(roomId, {
                    readAt: threadResult.newestCreatedAt,
                });
            if (isCurrent()) await refreshTypingIndicator();
        })()
            .catch((error) => {
                if (isCurrent()) throw error;
            })
            .finally(() => {
                if (refreshing?.promise === promise) refreshing = null;
            });
        refreshing = { generation, promise };
        return promise;
    }

    const refreshInBackground = createBackgroundRefresh({
        captureRoom,
        i18n,
        operation: "refreshConversation",
        run: refreshActiveConversation,
    });

    function startLiveRefreshPolling() {
        if (liveRefreshIntervalId) {
            clearInterval(liveRefreshIntervalId);
            liveRefreshIntervalId = null;
        }
        if (
            !isActive() ||
            keyringAccessSuppressed() ||
            !selectedRoomId ||
            document.visibilityState !== "visible"
        )
            return;
        liveRefreshIntervalId = setInterval(
            refreshInBackground,
            liveRefreshIntervalMs,
        );
    }

    function extensionFromType(type) {
        const normalized = (type || "").split(";")[0].toLowerCase();
        if (normalized === "image/png") return "png";
        if (normalized === "image/webp") return "webp";
        if (normalized === "image/gif") return "gif";
        return "jpg";
    }

    function bindRoomHeaderEvents() {
        document
            .getElementById("messages-thread-header-slot")
            ?.querySelectorAll("[data-room-action]")
            .forEach((button) =>
                button.addEventListener("click", async () => {
                    const selectedRoom = getSelectedRoom();
                    const action = selectedRoomActions.find((candidate) => {
                        if (candidate.id === button.dataset.roomAction)
                            return true;
                        return candidate.actions?.some(
                            (nestedAction) =>
                                nestedAction.id === button.dataset.roomAction,
                        );
                    });
                    if (selectedRoom && action) {
                        const selectedAction =
                            action.actions?.find(
                                (nestedAction) =>
                                    nestedAction.id ===
                                    button.dataset.roomAction,
                            ) ?? action;
                        await onRoomAction(selectedRoom, selectedAction);
                    }
                }),
            );

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
        if (!isActive()) return;
        const expected = ++listGeneration;
        const isCurrent = captureRoom();
        const loaded = await loadRooms(i18n, { getRoomKey, isCurrent });
        if (!isCurrent() || expected !== listGeneration) return;
        rooms = loaded;
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
                    variant: "confirm",
                },
                {
                    id: "confirm",
                    label: i18n.t("module.social.messages.leave_room"),
                    variant: "cancel",
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
        if (disposed) return;
        disposed = true;
        generation += 1;
        signal?.removeEventListener("abort", cleanup);
        window.removeEventListener(
            "cognis:keyring-access-state",
            handleKeyringAccessState,
        );
        hideAllMessageHoverPopups();
        destroyMessageHoverPopups();
        typing.cleanup();
        if (liveRefreshIntervalId) clearInterval(liveRefreshIntervalId);
    }

    function getSelectedRoom() {
        return rooms.find((room) => String(room.id) === String(selectedRoomId));
    }

    return {
        cleanup,
        captureRoom,
        isActive,
        createConversationFromHandle,
        getRooms: () => rooms,
        getSelectedRoom,
        getSelectedRoomId: () => selectedRoomId,
        loadInitialRooms,
        loadEarlierMessages,
        markSelectedRoomRead,
        openEmojiPickerPopup,
        openRoom,
        queueTypingUpdate,
        refreshActiveConversation,
        refreshInBackground,
        refreshTypingInBackground,
        refreshTypingIndicator,
        reloadRoomsList,
        renderRoomsListIntoDom,
        setSelectedRoomId,
        startLiveRefreshPolling,
        startTypingPolling,
        toggleReaction,
    };
}
