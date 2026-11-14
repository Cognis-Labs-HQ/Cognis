import { createBackgroundRefresh } from "./reuse/background-refresh.js";
import { messagesFetch as apiFetch } from "./offline-client.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

export function createTypingState({
    i18n,
    getSelectedRoomId,
    captureRoom,
    isEnabled,
    typingTtlSeconds,
    typingIdleResetMs,
    typingSendDebounceMs,
}) {
    let typingSendTimeoutId = null;
    let typingPollIntervalId = null;
    let typingActive = false;
    let lastTypingSentAt = 0;
    function startTypingPolling() {
        if (typingPollIntervalId) {
            clearInterval(typingPollIntervalId);
            typingPollIntervalId = null;
        }
        if (
            !isEnabled() ||
            !getSelectedRoomId() ||
            document.visibilityState !== "visible"
        )
            return;
        typingPollIntervalId = setInterval(refreshTypingInBackground, 3000);
    }

    function queueTypingUpdate(typing) {
        if (!isEnabled() || isOffline()) return;
        if (!getSelectedRoomId()) return;
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
            `/api/v1/social/messages/rooms/${encodeURIComponent(getSelectedRoomId())}/typing`,
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
        if (!isEnabled() || isOffline()) return;
        if (!getSelectedRoomId()) return;
        const isCurrent = captureRoom();
        try {
            const response = await apiFetch(
                `/api/v1/social/messages/rooms/${encodeURIComponent(getSelectedRoomId())}/typing`,
            );
            if (!isCurrent()) return;
            const typingStatusElement = document.getElementById(
                "messages-typing-status",
            );
            if (!typingStatusElement) return;
            if (!response.ok) {
                typingStatusElement.innerHTML = "";
                return;
            }
            const payload = await response.json();
            if (!isCurrent()) return;
            const typers = payload?.data ?? [];
            if (!typers.length) {
                typingStatusElement.innerHTML = "";
                return;
            }
            const names = typers
                .slice(0, 2)
                .map(
                    (typer) =>
                        typer.displayName || typer.handle || typer.accountId,
                )
                .join(", ");
            const typingLabel = i18n
                .t("module.social.messages.typing_users")
                .replace("{names}", names);
            typingStatusElement.innerHTML = `<span class="messages-typing-indicator" aria-hidden="true"><span></span><span></span><span></span></span><span class="messages-typing-label">${escapeHtml(typingLabel)}</span>`;
        } catch (error) {
            if (isCurrent()) throw error;
        }
    }

    const refreshTypingInBackground = createBackgroundRefresh({
        captureRoom,
        i18n,
        operation: "refreshTyping",
        run: refreshTypingIndicator,
    });

    function cleanup() {
        if (typingSendTimeoutId) clearTimeout(typingSendTimeoutId);
        if (typingPollIntervalId) clearInterval(typingPollIntervalId);
        typingSendTimeoutId = null;
        typingPollIntervalId = null;
        typingActive = false;
    }

    return {
        queueTypingUpdate,
        refreshTypingIndicator,
        refreshTypingInBackground,
        startTypingPolling,
        cleanup,
    };
}
