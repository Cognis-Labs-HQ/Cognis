export function createRoomKeyStore({
    importKey = async () => {
        throw new Error("importKey dependency is required.");
    },
    onInvalidSecret = () => undefined,
    resolveSecret = async (_id, options) => options.fallback?.(),
} = {}) {
    const roomKeyCache = new Map();

    function hasIncomingPendingRequest(roomContext) {
        const pendingRequest =
            roomContext?.pendingRequest ?? roomContext ?? null;
        return pendingRequest?.direction === "incoming";
    }

    async function getRoomKey(roomId) {
        if (roomKeyCache.has(roomId)) return roomKeyCache.get(roomId);
        const hex = await resolveSecret(`chatroom:${roomId}:key`, {
            validate: async (candidate) => {
                await importKey(candidate);
                return true;
            },
            onInvalid: () => onInvalidSecret(roomId),
            metadata: {
                label: `Chat ${roomId}`,
            },
        });
        if (!hex) return null;
        const key = await importKey(hex);
        roomKeyCache.set(roomId, key);
        return key;
    }

    async function requireRoomKey(roomId) {
        const cached = await getRoomKey(roomId);
        if (cached) return cached;
        const error = new Error("Room key is unavailable in the keyring.");
        error.code = "missing_keyring_secret";
        error.roomId = roomId;
        throw error;
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
