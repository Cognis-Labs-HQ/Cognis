import { messagesFetch as apiFetch } from "./offline-client.js";
import { encryptMessage } from "./message-utils.js";
import { resolveMessageTemplateVariables } from "./message-templates.js";
import { showToast } from "/static/reuse/toast.js";

/** Retain the draft until encrypted delivery or durable queuing has succeeded. */
export function createMessageSender({
    roomState,
    composerInput,
    currentAccountId,
    requireRoomKey,
    clearPersistedFormState,
    renderComposerPreview,
    i18n,
}) {
    let sending = false;
    return async (event) => {
        event.preventDefault();
        if (sending) return;
        sending = true;
        let delivered = false;
        try {
            const selectedRoomId = roomState.getSelectedRoomId();
            if (!selectedRoomId) return;
            const currentRoom = roomState.getSelectedRoom();
            if (currentRoom?.canSend === false || currentRoom?.isArchived) {
                showToast(
                    i18n.t("module.social.messages.archived_cannot_send"),
                    {
                        variant: "error",
                    },
                );
                return;
            }
            const text = resolveMessageTemplateVariables(
                composerInput instanceof HTMLTextAreaElement
                    ? composerInput.value
                    : "",
                currentRoom,
                currentAccountId,
            ).trim();
            if (!text) return;
            roomState.queueTypingUpdate(false);
            let key = null;
            try {
                key = await requireRoomKey(selectedRoomId);
            } catch (error) {
                console.error("[messages] requireRoomKey failed", error);
                key = null;
            }
            if (!key) {
                showToast(i18n.t("module.social.messages.key_unavailable"), {
                    variant: "error",
                });
                return;
            }
            const { iv, ciphertext } = await encryptMessage(key, text);
            const response = await apiFetch(
                `/api/v1/social/messages/rooms/${encodeURIComponent(selectedRoomId)}/messages`,
                {
                    method: "POST",
                    body: JSON.stringify({ ciphertext, iv }),
                },
            );
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                const code = payload?.error?.code;
                if (code === "not_member") {
                    showToast(
                        i18n.t("module.social.messages.not_member_cannot_send"),
                        {
                            variant: "error",
                        },
                    );
                    await roomState.reloadRoomsList();
                    return;
                }
                if (code === "chat_archived") {
                    showToast(
                        i18n.t("module.social.messages.archived_cannot_send"),
                        {
                            variant: "error",
                        },
                    );
                    await roomState.reloadRoomsList();
                    return;
                }
                showToast(i18n.t("module.social.messages.send_failed"), {
                    variant: "error",
                });
                return;
            }
            const receipt = await response.json();
            delivered = true;
            if (receipt.queued)
                showToast(i18n.t("ui.reuse.offline_changes_queued"), {
                    variant: "info",
                });
            if (composerInput instanceof HTMLTextAreaElement) {
                clearPersistedFormState(selectedRoomId);
                composerInput.value = "";
            }
            renderComposerPreview();
            await roomState.openRoom(selectedRoomId);
            if (!receipt.queued) {
                await roomState.refreshTypingIndicator();
                roomState.startLiveRefreshPolling();
            }
        } catch (error) {
            console.error(
                delivered
                    ? "[messages] message view refresh failed"
                    : "[messages] message delivery failed",
                {
                    component: "social-messages",
                    operation: "sendMessage",
                    errorName: error.name,
                    delivered,
                },
            );
            if (delivered) return;
            showToast(
                i18n.t(
                    error.message === "offline_outbox_full"
                        ? "ui.reuse.offline_buffer_full_body"
                        : "module.social.messages.send_failed",
                ),
                { variant: "error" },
            );
        } finally {
            sending = false;
        }
    };
}
