import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { formatTime } from "/static/reuse/timestamp.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import { importRoomKey } from "/static/reuse/crypto-utils.js";
import {
    decryptMessageOrReturnPlaintext,
    encryptMessage,
    extractRoomId,
    resolveMessageStyle,
} from "./message-utils.js";

const CHAT_REFRESH_INTERVAL_MS = 4_000;

/**
 * Creates a native mini-chat panel for embedding in the classroom workspace.
 * Loaded dynamically by the classroom via a meta-tag-injected script URL from
 * the social gateway, avoiding a hardcoded static import in the classes adapter.
 *
 * @param {object} options
 * @param {object} options.i18n - I18n helper with a `.t(key)` method.
 * @param {Function} [options.onVisibilityChange] - Called with `{ visible }` when panel opens/closes.
 * @returns {{ panel: HTMLElement, openChat: Function, closeChat: Function, destroy: Function, isOpen: Function }}
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
    const panelHeader = panel.querySelector(".classes-chat-panel-header");
    let draggingPanel = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    async function loadRoomKey(roomId) {
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/key`,
        );
        if (!response.ok) return null;
        const payload = await response.json().catch(() => ({ data: null }));
        const keyHex = String(payload?.data?.key ?? "").trim();
        if (!keyHex) return null;
        return importRoomKey(keyHex).catch(() => null);
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
            roomKey = await loadRoomKey(roomId);
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
                text: await decryptMessageOrReturnPlaintext(roomKey, m),
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
            onVisibilityChange({ visible: isOpen });
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
        const encrypted = await encryptMessage(roomKey, trimmed);
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
        const roomId = extractRoomId(chatUrl);
        document.documentElement.dataset.messageStyle = resolveMessageStyle();
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

    function resetDockedPosition() {
        panel.style.left = "";
        panel.style.top = "";
        panel.style.right = "";
        panel.style.bottom = "";
    }

    function startPanelDrag(event) {
        if (!(event instanceof MouseEvent)) return;
        if (event.button !== 0) return;
        if (window.innerWidth <= 900) return;
        const panelBounds = panel.getBoundingClientRect();
        draggingPanel = true;
        dragOffsetX = event.clientX - panelBounds.left;
        dragOffsetY = event.clientY - panelBounds.top;
        panel.classList.add("classes-chat-panel--dragging");
        panel.style.left = `${panelBounds.left}px`;
        panel.style.top = `${panelBounds.top}px`;
        panel.style.right = "auto";
        panel.style.bottom = "auto";
        event.preventDefault();
    }

    function handlePanelDrag(event) {
        if (!draggingPanel) return;
        const panelBounds = panel.getBoundingClientRect();
        const maxLeft = Math.max(0, window.innerWidth - panelBounds.width);
        const maxTop = Math.max(0, window.innerHeight - panelBounds.height);
        const nextLeft = Math.min(
            Math.max(event.clientX - dragOffsetX, 0),
            maxLeft,
        );
        const nextTop = Math.min(
            Math.max(event.clientY - dragOffsetY, 0),
            maxTop,
        );
        panel.style.left = `${nextLeft}px`;
        panel.style.top = `${nextTop}px`;
    }

    function stopPanelDrag() {
        if (!draggingPanel) return;
        draggingPanel = false;
        panel.classList.remove("classes-chat-panel--dragging");
    }

    panelHeader?.addEventListener("mousedown", startPanelDrag);
    window.addEventListener("mousemove", handlePanelDrag);
    window.addEventListener("mouseup", stopPanelDrag);
    window.addEventListener("resize", () => {
        if (window.innerWidth <= 900) {
            resetDockedPosition();
        }
    });

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
