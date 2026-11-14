import { messagesFetch } from "./offline-client.js";
import { showToast } from "/static/reuse/toast.js";

export function createReadAcknowledgements({
    getRooms,
    updateRooms,
    isActive,
    i18n,
}) {
    const pending = new Map();
    let failureReported = false;
    const log = (level, message, context) =>
        console[level](message, {
            component: "social-messages",
            operation: "acknowledgeRead",
            ...context,
        });

    function markRead(roomId, { force = false, readAt: visibleReadAt } = {}) {
        if (!roomId || !isActive()) return Promise.resolve(false);
        const room = getRooms().find(
            (entry) => String(entry.id) === String(roomId),
        );
        if (!room || (!force && Number(room.unread ?? 0) <= 0))
            return Promise.resolve(false);
        if (pending.has(roomId)) return pending.get(roomId);
        const readAt =
            visibleReadAt ??
            room.lastMessage?.createdAt ??
            new Date().toISOString();
        const operation = (async () => {
            try {
                const response = await messagesFetch(
                    `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/read`,
                    {
                        method: "POST",
                        body: JSON.stringify({ readAt }),
                    },
                );
                if (!isActive()) return false;
                if (!response.ok)
                    throw new Error("read_acknowledgement_failed");
                failureReported = false;
                updateRooms(
                    getRooms().map((entry) =>
                        String(entry.id) === String(roomId) &&
                        entry.lastMessage?.createdAt ===
                            room.lastMessage?.createdAt &&
                        entry.unread === room.unread &&
                        (!entry.lastMessage?.createdAt ||
                            entry.lastMessage.createdAt <= readAt)
                            ? { ...entry, unread: 0 }
                            : entry,
                    ),
                );
                log("info", "[messages] read acknowledged", { roomId });
                return true;
            } catch (error) {
                if (!isActive()) return false;
                log("error", "[messages] read acknowledgement failed", {
                    roomId,
                    errorName: error.name,
                });
                if (!failureReported) {
                    failureReported = true;
                    showToast(i18n.t("module.social.messages.read_failed"), {
                        variant: "error",
                    });
                }
                return false;
            }
        })().finally(() => {
            if (pending.get(roomId) === operation) pending.delete(roomId);
        });
        pending.set(roomId, operation);
        return operation;
    }

    return markRead;
}
