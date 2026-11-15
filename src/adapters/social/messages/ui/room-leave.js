import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { messagesFetch } from "./offline-client.js";
import { createMessageActionOwner } from "./reuse/action-ownership.js";

export function createRoomLeaveAction({
    i18n,
    currentAccountId,
    signal,
    isActive,
    captureRoom,
    getSelectedRoom,
    reloadRoomsList,
    openFallbackAfterRoomRemoval,
    log,
}) {
    const owner = createMessageActionOwner({
        isActive,
        captureOwner: captureRoom,
        signal,
    });
    const unavailable = new Set();
    const inFlight = new Set();
    let boundControl = null;

    function bind(button) {
        if (!button) return;
        const ownsControl = captureRoom();
        const roomId = getSelectedRoom()?.id;
        boundControl = { button, ownsControl, roomId };
        button.disabled = unavailable.has(roomId) || inFlight.has(roomId);
        button.addEventListener("click", async () => {
            if (!button.isConnected || !ownsControl() || button.disabled)
                return;
            const room = getSelectedRoom();
            const member = room?.members?.find(
                (entry) => entry.accountId === currentAccountId,
            );
            const handle = member?.handle;
            if (
                !handle ||
                room.id !== roomId ||
                unavailable.has(roomId) ||
                inFlight.has(roomId)
            )
                return;
            const request = uiCtx.capabilities.get("social:messagesRequest");
            if (!request) return;
            const ownsRequest = () =>
                isActive() &&
                ownsControl() &&
                uiCtx.capabilities.get("social:messagesRequest") === request;
            const authorized = () =>
                getSelectedRoom()?.members?.some(
                    (entry) =>
                        entry.accountId === currentAccountId &&
                        entry.handle === handle,
                );
            const action = owner.begin(
                () =>
                    authorized() &&
                    uiCtx.capabilities.get("social:messagesRequest") ===
                        request,
            );
            if (!action) return;
            inFlight.add(roomId);
            button.disabled = true;
            let dispatched = false;
            let acknowledged = false;
            try {
                const result = await openPopup({
                    signal: action.signal,
                    onOpen: () => action.current(),
                    title: i18n.t("module.social.messages.leave_confirm_title"),
                    body: `<p>${escapeHtml(i18n.t("module.social.messages.leave_confirm_body").replace("{name}", handle))}</p>`,
                    variant: "danger",
                    actions: [
                        {
                            id: "cancel",
                            label: i18n.t("ui.reuse.cancel"),
                            variant: "neutral",
                        },
                        {
                            id: "confirm",
                            label: i18n.t("module.social.messages.leave_room"),
                            variant: "cancel",
                        },
                    ],
                });
                if (result !== "confirm" || !action.current()) return;
                const response = await messagesFetch(
                    `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(handle)}`,
                    {
                        method: "DELETE",
                        signal: action.signal,
                        beforeDispatch: () => {
                            if (!action.current())
                                throw new Error("obsolete_messages_action");
                            dispatched = true;
                            log("info", "[messages] leaving conversation", {
                                operation: "leaveRoom",
                                roomId,
                            });
                        },
                    },
                );
                if (!response.ok) {
                    if (action.current())
                        showToast(
                            i18n.t("module.social.messages.leave_failed"),
                            { variant: "error" },
                        );
                    return;
                }
                acknowledged = true;
                unavailable.add(roomId);
                if (!action.current()) return;
                showToast(i18n.t("module.social.messages.leave_succeeded"), {
                    variant: "success",
                });
                await reloadRoomsList({
                    requireLive: true,
                    isCurrent: action.current,
                });
                // A successful removal also removes membership from the refreshed list.
                if (!ownsRequest()) return;
                await openFallbackAfterRoomRemoval(roomId);
            } catch (error) {
                if (dispatched) unavailable.add(roomId);
                log("error", "[messages] leave conversation failed", {
                    operation: acknowledged ? "refreshAfterLeave" : "leaveRoom",
                    roomId,
                    outcome: acknowledged
                        ? "acknowledged"
                        : dispatched
                          ? "uncertain"
                          : "notDispatched",
                    errorName: error.name,
                });
                if (action.current())
                    showToast(
                        i18n.t(
                            acknowledged
                                ? "module.social.messages.leave_refresh_failed"
                                : dispatched
                                  ? "module.social.messages.leave_uncertain"
                                  : "module.social.messages.leave_failed",
                        ),
                        { variant: "error" },
                    );
            } finally {
                inFlight.delete(roomId);
                action.finish();
                if (
                    boundControl?.button.isConnected &&
                    boundControl.ownsControl()
                ) {
                    boundControl.button.disabled =
                        unavailable.has(boundControl.roomId) ||
                        inFlight.has(boundControl.roomId);
                }
            }
        });
    }

    return { bind, invalidate: owner.invalidate };
}
