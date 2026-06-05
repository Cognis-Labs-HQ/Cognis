export function createRoomKeyStore({
    fetchRoomKey = async () => {
        throw new Error("fetchRoomKey dependency is required.");
    },
    importKey = async () => {
        throw new Error("importKey dependency is required.");
    },
} = {}) {
    const roomKeyCache = new Map();

    function hasIncomingPendingRequest(roomContext) {
        const pendingRequest =
            roomContext?.pendingRequest ?? roomContext ?? null;
        return pendingRequest?.direction === "incoming";
    }

    async function getRoomKey(roomId) {
        if (roomKeyCache.has(roomId)) return roomKeyCache.get(roomId);
        const res = await fetchRoomKey(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/key`,
        );
        if (!res.ok) return null;
        const payload = await res.json();
        const hex = payload?.data?.key;
        if (!hex) return null;
        const key = await importKey(hex);
        roomKeyCache.set(roomId, key);
        return key;
    }

    async function requireRoomKey(roomId) {
        if (roomKeyCache.has(roomId)) return roomKeyCache.get(roomId);
        const res = await fetchRoomKey(
            `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}/key`,
        );
        if (!res.ok) {
            const payload = await res.json().catch(() => null);
            const message =
                payload?.error?.message ||
                `Failed to load room key (${res.status} ${res.statusText || "unknown"}).`;
            const error = new Error(message);
            error.status = res.status;
            error.code = payload?.error?.code;
            error.roomId = roomId;
            throw error;
        }
        const payload = await res.json();
        const hex = payload?.data?.key;
        if (!hex) {
            const error = new Error("Room key missing.");
            error.status = 500;
            error.code = "missing_key";
            error.roomId = roomId;
            throw error;
        }
        const key = await importKey(hex);
        roomKeyCache.set(roomId, key);
        return key;
    }

    async function resolveThreadRoomKey(roomContext, roomId) {
        if (hasIncomingPendingRequest(roomContext)) return null;
        return requireRoomKey(roomId);
    }

    return {
        getRoomKey,
        requireRoomKey,
        resolveThreadRoomKey,
        hasIncomingPendingRequest,
    };
}
