import { messagesFetch as apiFetch } from "./offline-client.js";
import { encryptMessage } from "./message-utils.js";
import { resolveMessageTemplateVariables } from "./message-templates.js";
import { showToast } from "/static/reuse/toast.js";

/** Retain the draft until encrypted delivery or durable queuing has succeeded. */
export function createMessageSender({
    roomState,
    currentAccountId,
    requireRoomKey,
    drafts,
    renderComposerPreview,
    i18n,
}) {
    let sending = false;
    const log = (level, message, context) =>
        console[level](message, {
            component: "social-messages",
            operation: "sendMessage",
            ...context,
        });
    return async (event) => {
        event.preventDefault();
        if (sending || !roomState.isActive()) return;
        sending = true;
        let delivered = false;
        const isSelected = roomState.captureRoom();
        try {
            const selectedRoomId = roomState.getSelectedRoomId();
            if (!selectedRoomId) return;
            const currentRoom = roomState.getSelectedRoom();
            if (
                !currentRoom ||
                currentRoom.canSend === false ||
                currentRoom.isArchived
            ) {
                showToast(
                    i18n.t("module.social.messages.archived_cannot_send"),
                    {
                        variant: "error",
                    },
                );
                return;
            }
            const snapshot = drafts.capture(selectedRoomId);
            const text = resolveMessageTemplateVariables(
                snapshot.value,
                currentRoom,
                currentAccountId,
            ).trim();
            if (!text) return;
            roomState.queueTypingUpdate(false);
            let key = null;
            try {
                key = await requireRoomKey(selectedRoomId);
            } catch (error) {
                if (!isSelected()) return;
                log("error", "[messages] room key unavailable", {
                    errorName: error.name,
                });
                key = null;
            }
            if (!roomState.isActive()) return;
            if (!key) {
                showToast(i18n.t("module.social.messages.key_unavailable"), {
                    variant: "error",
                });
                return;
            }
            const { iv, ciphertext } = await encryptMessage(key, text);
            if (!roomState.isActive()) return;
            const response = await apiFetch(
                `/api/v1/social/messages/rooms/${encodeURIComponent(selectedRoomId)}/messages`,
                {
                    method: "POST",
                    body: JSON.stringify({ ciphertext, iv }),
                },
            );
            if (!roomState.isActive()) return;
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                if (!isSelected()) return;
                const code = payload?.error?.code;
                log("error", "[messages] message delivery rejected", {
                    status: response.status,
                });
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
            delivered = true;
            log("info", "[messages] message accepted", {
                roomId: selectedRoomId,
            });
            drafts.consume(snapshot);
            if (isSelected()) renderComposerPreview();
            const receipt = await response.json();
            if (!isSelected()) return;
            await roomState.refreshActiveConversation();
            if (!isSelected()) return;
            if (!receipt.queued) {
                await roomState.refreshTypingIndicator();
                roomState.startLiveRefreshPolling();
            }
        } catch (error) {
            if (!isSelected()) return;
            log(
                "error",
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
            if (delivered) {
                showToast(i18n.t("module.social.messages.refresh_failed"), {
                    variant: "error",
                });
                return;
            }
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
