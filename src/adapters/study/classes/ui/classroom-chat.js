import { escapeHtml } from "/static/reuse/escape-html.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import { formatTime } from "/static/reuse/timestamp.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import {
    bytesToHex,
    hexToBytes,
    importRoomKey,
} from "/static/reuse/crypto-utils.js";
import {
    CHAT_REFRESH_INTERVAL_MS,
    TEXT_ENCODER,
} from "/static/modules/jitsi-meet/constants.js";

/**
 * Parses the room ID from a chatUrl of the form `/messages/{roomId}`.
 */
function parseRoomId(chatUrl) {
    if (!chatUrl) return "";
    const match = chatUrl.match(/\/messages\/([^?#]+)/);
    return match ? decodeURIComponent(match[1]).trim() : "";
}

/**
 * Creates a native mini-chat panel for the classroom, replacing the
 * previously iframe-embedded Messages page. Exposes openChat(chatUrl),
 * closeChat(), and destroy().
 */
export function createClassroomNativeChat({ i18n, onVisibilityChange }) {
    let chatRoomId = "";
    let roomKey = null;
    let refreshTimer = null;

    const panel = document.createElement("div");
    panel.className = "classes-chat-panel";
    panel.dataset.open = "false";
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("aria-label", i18n.t("module.study.classes.open_chat"));
    panel.innerHTML = `
        <div class="classes-chat-panel-header">
            <span class="classes-chat-panel-title">${escapeHtml(i18n.t("module.study.classes.open_chat"))}</span>
            <button type="button" class="classes-chat-close-btn classes-window-close-btn">
                ${escapeHtml(i18n.t("ui.reuse.close"))}
            </button>
        </div>
        <div class="classes-chat-thread" role="log" aria-live="polite" aria-busy="true"></div>
        <form class="classes-chat-form">
            <textarea class="classes-chat-input" rows="2"
                placeholder="${escapeHtml(i18n.t("module.study.classes.chat_placeholder"))}"
                disabled></textarea>
        </form>
    `;

    const thread = panel.querySelector(".classes-chat-thread");
    const form = panel.querySelector(".classes-chat-form");
    const input = panel.querySelector(".classes-chat-input");

    async function fetchRoomKey(roomId) {
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/key`,
        );
        if (!response.ok) return null;
        const payload = await response.json().catch(() => ({ data: null }));
        const keyHex = String(payload?.data?.key ?? "").trim();
        if (!keyHex) return null;
        return importRoomKey(keyHex).catch(() => null);
    }

    async function decryptMessage(message, key) {
        if (!key) return null;
        const initVector = String(message?.iv ?? "").trim();
        const cipherHex = String(message?.ciphertext ?? "").trim();
        const authTag = String(message?.authTag ?? "").trim();
        if (!initVector || !cipherHex) return null;
        try {
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: hexToBytes(initVector) },
                key,
                hexToBytes(`${cipherHex}${authTag}`),
            );
            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.debug("[classroom-chat] message decryption failed.", error);
            return null;
        }
    }

    async function encryptMessage(text, key) {
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

    function renderMessages(messages) {
        if (!(thread instanceof HTMLElement)) return;
        if (!Array.isArray(messages) || messages.length === 0) {
            thread.innerHTML = `<p class="classes-chat-empty">${escapeHtml(i18n.t("module.study.classes.chat_empty"))}</p>`;
            return;
        }
        thread.innerHTML = messages
            .map((msg) => {
                const isOwn =
                    String(msg?.senderId ?? "") ===
                    String(localStorage.getItem("cognis_account") ?? "");
                const itemClass = isOwn
                    ? "classes-chat-message classes-chat-message--own"
                    : "classes-chat-message";
                const sender = String(
                    msg?.senderDisplayName ??
                        msg?.senderHandle ??
                        msg?.senderUsername ??
                        "",
                ).trim();
                const time = msg.createdAt
                    ? escapeHtml(formatTime(new Date(msg.createdAt)))
                    : "";
                const body = renderMarkdown(String(msg?.text ?? ""), {
                    softBreaks: true,
                });
                return `<article class="${itemClass}">
                    <header class="classes-chat-message-head">
                        <strong>${escapeHtml(sender)}</strong>
                        <time>${time}</time>
                    </header>
                    <div class="classes-chat-message-body">${body}</div>
                </article>`;
            })
            .join("");
        thread.scrollTop = thread.scrollHeight;
    }

    async function refresh() {
        const roomId = chatRoomId;
        if (!roomId) return;
        if (!roomKey) {
            roomKey = await fetchRoomKey(roomId);
        }
        if (!roomKey) return;
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages?limit=50`,
        );
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({ data: [] }));
        const ordered = Array.isArray(payload?.data)
            ? payload.data
                  .slice()
                  .reverse()
                  .filter(
                      (m) =>
                          m?.contentType !==
                          "application/vnd.cognis.room-event+json",
                  )
            : [];
        const decoded = await Promise.all(
            ordered.map(async (m) => ({
                ...m,
                text: await decryptMessage(m, roomKey),
            })),
        );
        renderMessages(decoded);
        if (thread instanceof HTMLElement) {
            thread.setAttribute("aria-busy", "false");
        }
        if (input instanceof HTMLTextAreaElement) {
            input.disabled = false;
        }
    }

    function startPolling() {
        if (refreshTimer !== null) return;
        void refresh();
        refreshTimer = setInterval(
            () => void refresh(),
            CHAT_REFRESH_INTERVAL_MS,
        );
    }

    function stopPolling() {
        if (refreshTimer !== null) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    function setPanelVisibility(open) {
        const isOpen = Boolean(open);
        panel.dataset.open = isOpen ? "true" : "false";
        panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
        if (typeof onVisibilityChange === "function") {
            onVisibilityChange(isOpen);
        }
    }

    function showSelectChatPrompt() {
        stopPolling();
        chatRoomId = "";
        roomKey = null;
        if (thread instanceof HTMLElement) {
            thread.setAttribute("aria-busy", "false");
            thread.innerHTML = `<p class="classes-chat-empty">${escapeHtml(i18n.t("module.study.classes.chat_select_class_prompt"))}</p>`;
        }
        if (input instanceof HTMLTextAreaElement) {
            input.disabled = true;
        }
    }

    async function sendMessage(text) {
        const roomId = chatRoomId;
        if (!roomId || !roomKey) return;
        const trimmed = text.trim();
        if (!trimmed) return;
        const encrypted = await encryptMessage(trimmed, roomKey);
        await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    iv: encrypted.iv,
                    ciphertext: encrypted.ciphertext,
                }),
            },
        );
        await refresh();
    }

    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!(input instanceof HTMLTextAreaElement) || !input.value.trim()) {
            return;
        }
        const text = input.value;
        input.value = "";
        sendMessage(text).catch(() => {
            showToast(i18n.t("module.study.classes.chat_failed"), {
                variant: "error",
            });
        });
    });

    input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            form?.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true }),
            );
        }
    });

    function openChat(chatUrl) {
        const roomId = parseRoomId(chatUrl);
        setPanelVisibility(true);
        if (!roomId) {
            showSelectChatPrompt();
            return;
        }
        if (chatRoomId !== roomId) {
            stopPolling();
            chatRoomId = roomId;
            roomKey = null;
            if (thread instanceof HTMLElement) {
                thread.innerHTML = "";
                thread.setAttribute("aria-busy", "true");
            }
            if (input instanceof HTMLTextAreaElement) {
                input.disabled = true;
            }
        }
        startPolling();
    }

    function closeChat() {
        stopPolling();
        setPanelVisibility(false);
    }

    function destroy() {
        stopPolling();
    }

    return {
        panel,
        openChat,
        closeChat,
        destroy,
        isOpen: () => panel.dataset.open === "true",
    };
}
