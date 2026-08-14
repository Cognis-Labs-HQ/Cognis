import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import { showToast } from "/static/reuse/toast.js";
import { formatTime } from "/static/reuse/timestamp.js";
import { bytesToHex, hexToBytes } from "/static/reuse/crypto-utils.js";
import { hydrateProfileAvatars } from "/static/gateways/social/reuse/profile-avatar.js";
import { normalizeUsername } from "/static/reuse/value-normalizers.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { TEXT_ENCODER, CHAT_REFRESH_INTERVAL_MS } from "./constants.js";

import {
    createChatParticipantAvatarButton,
    normalizeChatRoomId,
    resolveMeetingChatRoomId,
} from "./jitsi-helpers.js";

export function createChatHandlers({
    root,
    state,
    i18n,
    apiFetch,
    messageReactions,
    loadChatRoomKey,
}) {
    async function getChatRoomKey(roomId) {
        if (!roomId) return null;
        if (state.chatRoomKey && state.chatRoomId === roomId) {
            return state.chatRoomKey;
        }
        if (typeof loadChatRoomKey !== "function") return null;
        const roomKey = await loadChatRoomKey(roomId, {
            recoverMissing: true,
            accessToken: state.shareAccessToken,
        });
        state.chatRoomKey = roomKey;
        return roomKey;
    }

    async function decryptChatMessage(message, key) {
        if (!key) return null;
        const initVectorHex = String(message?.iv ?? "").trim();
        const cipherHex = String(message?.ciphertext ?? "").trim();
        const authTag = String(message?.authTag ?? "").trim();
        if (!initVectorHex || !cipherHex) return null;
        try {
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: hexToBytes(initVectorHex) },
                key,
                hexToBytes(`${cipherHex}${authTag}`),
            );
            return new TextDecoder().decode(decrypted);
        } catch {
            return null;
        }
    }

    async function encryptChatMessage(text, key) {
        const initVector = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: initVector },
            key,
            TEXT_ENCODER.encode(text),
        );
        return {
            iv: bytesToHex(initVector),
            ciphertext: bytesToHex(new Uint8Array(encrypted)),
        };
    }

    function renderChatMessages(messages) {
        const chatThread = root.querySelector("#jitsi-chat-thread");
        if (!(chatThread instanceof HTMLElement)) return;
        messageReactions.hideReactionHoverPopup();
        if (!Array.isArray(messages) || messages.length === 0) {
            chatThread.innerHTML = `<p class="jitsi-chat-empty">${escapeHtml(i18n.t("module.jitsi_meet.chat.empty"))}</p>`;
            return;
        }
        chatThread.innerHTML = messages
            .map((message) => {
                const isOwn =
                    String(message?.senderId ?? "") ===
                    String(localStorage.getItem("cognis_account") ?? "");
                const messageClass = isOwn
                    ? "jitsi-chat-message jitsi-chat-message-own"
                    : "jitsi-chat-message";
                const sender =
                    String(message?.senderDisplayName ?? "").trim() ||
                    String(message?.senderHandle ?? "").trim() ||
                    String(message?.senderId ?? "").trim() ||
                    "Unknown";
                const createdAt = String(message?.createdAt ?? "").trim();
                const safeTime = formatTime(createdAt, "");
                const body = renderMarkdown(
                    String(message?.text ?? i18n.t("ui.reuse.unknown")),
                    { softBreaks: true },
                );
                return `<article class="${messageClass}">
          <header class="jitsi-chat-message-head">
            <strong>${escapeHtml(sender)}</strong>
            <time>${escapeHtml(safeTime)}</time>
          </header>
          <div class="jitsi-chat-message-body">${body}</div>
          ${messageReactions.renderReactionRow(message)}
        </article>`;
            })
            .join("");
    }

    async function toggleReaction(roomId, messageId, emoji) {
        await messageReactions.toggleReaction(roomId, messageId, emoji);
    }

    async function openEmojiPickerPopup(roomId, messageId) {
        await messageReactions.openEmojiPickerPopup(roomId, messageId);
    }

    function clearNativeChatThread() {
        const chatThread = root.querySelector("#jitsi-chat-thread");
        if (chatThread instanceof HTMLElement) {
            chatThread.replaceChildren();
        }
    }

    function setNativeChatReady(ready) {
        const chatPane = root.querySelector(".jitsi-chat-pane");
        const chatThread = root.querySelector("#jitsi-chat-thread");
        const chatForm = root.querySelector("#jitsi-chat-form");
        const chatInput = root.querySelector("#jitsi-chat-input");
        if (chatPane instanceof HTMLElement) {
            chatPane.classList.toggle("jitsi-chat-disabled", !ready);
            chatPane.setAttribute("aria-disabled", String(!ready));
        }
        if (chatThread instanceof HTMLElement) {
            chatThread.setAttribute("aria-busy", String(!ready));
        }
        if (chatForm instanceof HTMLFormElement) {
            chatForm.hidden = !ready;
        }
        if (chatInput instanceof HTMLTextAreaElement) {
            chatInput.disabled = !ready;
        }
    }

    function stopNativeChatPolling() {
        if (state.chatRefreshTimer === null) return;
        clearInterval(state.chatRefreshTimer);
        state.chatRefreshTimer = null;
    }

    function applyActiveChatRoom(roomId) {
        if (state.chatRoomId === roomId) return;
        state.chatRoomId = roomId;
        state.chatRoomKey = null;
        stopNativeChatPolling();
    }

    function resolveParticipantChatEntries() {
        if (!state.meeting?.id) return [];
        if (state.shareAccessToken && state.chatParticipantEntries.length > 0) {
            return state.chatParticipantEntries;
        }
        const localHandle = normalizeUsername(
            state.currentProfile?.handle ?? "",
        );
        return Array.from(
            new Set(
                state.lastMeetingParticipants
                    .map((entry) => normalizeUsername(entry))
                    .filter(Boolean)
                    .filter((entry) => entry !== localHandle),
            ),
        )
            .map((username) => {
                const participant = state.allParticipants.find(
                    (entry) => normalizeUsername(entry?.username) === username,
                );
                return {
                    username,
                    displayName: participant?.displayName || username,
                    avatarKey: participant?.avatarKey ?? null,
                };
            })
            .sort((left, right) => left.username.localeCompare(right.username));
    }

    function renderChatParticipantStrip() {
        const strip = root.querySelector("#jitsi-chat-participant-strip");
        const returnButton = root.querySelector("#jitsi-chat-return-btn");
        const heading = root.querySelector("#jitsi-chat-heading");
        if (!(strip instanceof HTMLElement)) {
            return;
        }
        const entries = resolveParticipantChatEntries();
        const privateParticipant = entries.find(
            (entry) => entry.username === state.privateChatUsername,
        );
        if (heading instanceof HTMLElement) {
            if (state.chatMode === "private" && privateParticipant) {
                const privateHeadingTemplate = i18n.t(
                    "module.jitsi_meet.chat.heading_private",
                );
                heading.textContent = privateHeadingTemplate.replace(
                    "{{displayName}}",
                    privateParticipant.displayName,
                );
            } else {
                heading.textContent = i18n.t("module.jitsi_meet.chat.heading");
            }
        }
        strip.hidden = entries.length === 0;
        strip.replaceChildren(
            ...entries.map((entry) =>
                createChatParticipantAvatarButton({
                    ...entry,
                    selected:
                        state.chatMode === "private" &&
                        state.privateChatUsername === entry.username,
                }),
            ),
        );
        void hydrateProfileAvatars(strip);
        if (returnButton instanceof HTMLButtonElement) {
            returnButton.hidden =
                state.chatMode !== "private" || !state.lastMeetingChatRoomId;
            returnButton.disabled = !state.lastMeetingChatRoomId;
        }
    }

    async function refreshNativeChat() {
        if (uiCtx.capabilities.get("keyring:isAccessSuppressed")?.() === true)
            return;
        const roomId = state.chatRoomId;
        if (!roomId) {
            setNativeChatReady(false);
            clearNativeChatThread();
            return;
        }
        const roomKey = await getChatRoomKey(roomId);
        if (!roomKey) {
            setNativeChatReady(false);
            clearNativeChatThread();
            return;
        }
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages?limit=50`,
            {
                accessToken: state.shareAccessToken || undefined,
                suppressAccessDeniedEvent: true,
            },
        );
        if (!response.ok) {
            setNativeChatReady(false);
            clearNativeChatThread();
            return;
        }
        const payload = await response.json().catch(() => ({ data: [] }));
        const ordered = Array.isArray(payload?.data)
            ? payload.data
                  .slice()
                  .reverse()
                  .filter(
                      (message) =>
                          message?.contentType !==
                          "application/vnd.cognis.room-event+json",
                  )
            : [];
        const decoded = await Promise.all(
            ordered.map(async (message) => ({
                ...message,
                text: await decryptChatMessage(message, roomKey),
            })),
        );
        renderChatMessages(decoded);
        setNativeChatReady(true);
    }

    function startNativeChatPolling() {
        if (uiCtx.capabilities.get("keyring:isAccessSuppressed")?.() === true)
            return;
        if (!state.chatRoomId || state.chatRefreshTimer !== null) return;
        state.chatRefreshTimer = setInterval(() => {
            void refreshNativeChat();
        }, CHAT_REFRESH_INTERVAL_MS);
    }

    function handleKeyringAccessState(event) {
        if (event.detail?.suppressed === true) {
            stopNativeChatPolling();
            return;
        }
        startNativeChatPolling();
    }

    window.addEventListener(
        "cognis:keyring-access-state",
        handleKeyringAccessState,
    );

    function cleanupChatHandlers() {
        window.removeEventListener(
            "cognis:keyring-access-state",
            handleKeyringAccessState,
        );
        stopNativeChatPolling();
    }

    async function activateMeetingChat() {
        state.chatMode = "meeting";
        state.privateChatUsername = "";
        applyActiveChatRoom(state.lastMeetingChatRoomId);
        renderChatParticipantStrip();
        await refreshNativeChat();
        startNativeChatPolling();
    }

    async function activatePrivateChatForParticipant(username) {
        const normalizedUsername = normalizeUsername(username);
        if (!normalizedUsername) {
            console.warn(
                "[jitsi-meet] invalid participant username for private chat",
                {
                    operation: "open_private_chat",
                    rawUsername: username,
                },
            );
            showToast(
                i18n.t("module.jitsi_meet.chat.private_open_unavailable"),
                {
                    variant: "warning",
                },
            );
            return;
        }
        const response = await apiFetch("/api/v1/social/messages/rooms", {
            method: "POST",
            body: JSON.stringify({
                handles: [normalizedUsername],
            }),
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const errorCode = String(payload?.error?.code ?? "").trim();
            const errorMessageKey =
                response.status === 401 ||
                response.status === 403 ||
                errorCode === "forbidden"
                    ? "module.jitsi_meet.chat.private_open_forbidden"
                    : "module.jitsi_meet.chat.private_open_unavailable";
            console.error("[jitsi-meet] failed to open private chat room", {
                operation: "open_private_chat",
                targetUsername: normalizedUsername,
                status: response.status,
                errorCode,
                errorMessage:
                    typeof payload?.error?.message === "string"
                        ? payload.error.message
                        : null,
            });
            showToast(i18n.t(errorMessageKey), {
                variant: "error",
            });
            return;
        }
        const payload = await response.json().catch(() => ({ data: null }));
        const roomId = normalizeChatRoomId(payload?.data?.id);
        if (!roomId) {
            console.error(
                "[jitsi-meet] private chat room response missing room id",
                {
                    operation: "open_private_chat",
                    targetUsername: normalizedUsername,
                    payload,
                },
            );
            showToast(
                i18n.t("module.jitsi_meet.chat.private_open_invalid_response"),
                {
                    variant: "error",
                },
            );
            return;
        }
        state.chatMode = "private";
        state.privateChatUsername = normalizedUsername;
        applyActiveChatRoom(roomId);
        renderChatParticipantStrip();
        await refreshNativeChat();
        startNativeChatPolling();
    }

    async function updateNativeChat() {
        const meetingChatRoomId = resolveMeetingChatRoomId(state.meeting);
        if (meetingChatRoomId) {
            state.lastMeetingChatRoomId = meetingChatRoomId;
        } else if (state.meeting?.id) {
            state.lastMeetingChatRoomId = "";
        }
        if (Array.isArray(state.meeting?.participants)) {
            state.lastMeetingParticipants = state.meeting.participants.slice();
        }
        if (state.chatMode !== "private") {
            applyActiveChatRoom(state.lastMeetingChatRoomId);
        }
        renderChatParticipantStrip();
        await refreshNativeChat();
        startNativeChatPolling();
    }

    return {
        activateMeetingChat,
        activatePrivateChatForParticipant,
        cleanupChatHandlers,
        encryptChatMessage,
        getChatRoomKey,
        openEmojiPickerPopup,
        refreshNativeChat,
        startNativeChatPolling,
        stopNativeChatPolling,
        toggleReaction,
        updateNativeChat,
    };
}
