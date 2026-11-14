import { messagesFetch as apiFetch } from "./offline-client.js";
import { renderThread } from "./message-render.js";
import { normalizeReactionEmoji } from "./message-utils.js";
import { nextReactionState } from "./reaction-state.js";
import { applyThreadReaction } from "./thread-reactions.js";
import { showToast } from "/static/reuse/toast.js";

export function createThreadActions({
    captureRoom,
    getSelectedRoomId,
    getSelectedRoom,
    resolveThreadRoomKey,
    currentAccountId,
    i18n,
    signal,
}) {
    async function runAction(operation, run) {
        const roomId = getSelectedRoomId();
        const isCurrent = captureRoom();
        if (!roomId || !isCurrent()) return;
        try {
            await run(roomId, isCurrent);
        } catch (error) {
            if (!isCurrent()) return;
            console.error("[messages] conversation action failed", {
                component: "social-messages",
                operation,
                errorName: error?.name,
            });
            showToast(i18n.t("module.social.messages.update_failed"), {
                variant: "error",
            });
        }
    }

    async function updateThread(
        roomId,
        isCurrent,
        beforeTime,
        refreshMessageId,
    ) {
        const threadList = document.getElementById("messages-thread-list");
        if (!threadList) return;
        const key = await resolveThreadRoomKey(getSelectedRoom(), roomId);
        if (!isCurrent()) return;
        const result = await renderThread(
            roomId,
            key,
            threadList,
            i18n,
            currentAccountId,
            beforeTime,
            { isCurrent, signal, refreshMessageId },
        );
        if (result?.obsolete) return;
        if (!result && isCurrent())
            throw new Error("conversation_update_failed");
    }

    async function toggleReaction(messageId, emoji) {
        if (!messageId || !emoji) return;
        const normalizedEmoji = normalizeReactionEmoji(emoji);
        if (!normalizedEmoji) return;
        await runAction("toggleReaction", async (roomId, isCurrent) => {
            const active = nextReactionState(messageId, normalizedEmoji);
            const response = await apiFetch(
                `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}/reactions`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        emoji: normalizedEmoji,
                        active,
                    }),
                    signal,
                },
            );
            if (!isCurrent()) return;
            if (!response.ok) throw new Error("reaction_update_failed");
            applyThreadReaction(
                document.getElementById("messages-thread-list"),
                {
                    roomId,
                    accountId: currentAccountId,
                    messageId,
                    emoji: normalizedEmoji,
                    active,
                    i18n,
                },
            );
            await updateThread(roomId, isCurrent, undefined, messageId);
        });
    }

    async function loadEarlierMessages(beforeTime) {
        if (!beforeTime) return;
        await runAction("loadEarlierMessages", (roomId, isCurrent) =>
            updateThread(roomId, isCurrent, beforeTime),
        );
    }

    return { toggleReaction, loadEarlierMessages };
}
