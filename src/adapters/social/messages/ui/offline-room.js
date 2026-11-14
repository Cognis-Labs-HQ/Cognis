import { uiCtx } from "/static/reuse/ui-ctx.js";
import { isOffline } from "/static/reuse/offline-state.js";

/** Require both authorized room metadata and its cached thread. @returns {boolean} Snapshot readiness. */
export function canOpenCachedRoom(id) {
    const request = uiCtx.capabilities.get("social:messagesRequest");
    const path = `/api/v1/social/messages/rooms/${encodeURIComponent(id)}`;
    return Boolean(
        request?.hasCachedRead(path) &&
        request.hasCachedRead(`${path}/messages?limit=50`),
    );
}

/** Keep cold room lists usable without automatically opening an uncached thread. @returns {string|null} Selected room. */
export function selectInitialRoomId(rooms, preferred) {
    const available = rooms.filter(
        (room) => !isOffline() || canOpenCachedRoom(room.id),
    );
    return (
        available.find((room) => String(room.id) === String(preferred))?.id ??
        available[0]?.id ??
        null
    );
}
