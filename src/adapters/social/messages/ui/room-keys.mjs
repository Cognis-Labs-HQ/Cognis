export function createRoomKeyStore({
    importKey = async () => {
        throw new Error("importKey dependency is required.");
    },
    onInvalidSecret = () => undefined,
    contributeSecret = async () => undefined,
    resolveSecret = async (_id, options) => options.fallback?.(),
    buildRequest = async () => null,
} = {}) {
    const roomKeyCache = new Map();
    const roomKeyValues = new Map();

    function hasIncomingPendingRequest(roomContext) {
        const pendingRequest =
            roomContext?.pendingRequest ?? roomContext ?? null;
        return pendingRequest?.direction === "incoming";
    }

    async function getRoomKey(roomId, authoritativeContribution = null) {
        const authoritativeValue =
            authoritativeContribution?.id === `chatroom:${roomId}:key`
                ? authoritativeContribution.value
                : null;
        if (
            roomKeyCache.has(roomId) &&
            (!authoritativeValue ||
                roomKeyValues.get(roomId) === authoritativeValue)
        ) {
            return roomKeyCache.get(roomId);
        }
        roomKeyCache.delete(roomId);
        roomKeyValues.delete(roomId);
        const hex = await resolveSecret(`chatroom:${roomId}:key`, {
            validate: async (candidate) => {
                await importKey(candidate);
                return !authoritativeValue || candidate === authoritativeValue;
            },
            onInvalid: () => onInvalidSecret(roomId),
            metadata: {
                label: `Chat ${roomId}`,
            },
            request: await buildRequest(roomId),
            fallback: authoritativeValue
                ? async () => authoritativeValue
                : undefined,
        });
        if (!hex) return null;
        const key = await importKey(hex);
        roomKeyCache.set(roomId, key);
        roomKeyValues.set(roomId, hex);
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

    async function contributeRoomKey(roomId, contribution) {
        if (
            contribution?.id !== `chatroom:${roomId}:key` ||
            typeof contribution?.value !== "string" ||
            !contribution.value
        ) {
            return false;
        }
        const key = await importKey(contribution.value);
        await contributeSecret(
            contribution.id,
            contribution.value,
            contribution.metadata ?? {},
        );
        roomKeyCache.set(roomId, key);
        roomKeyValues.set(roomId, contribution.value);
        return true;
    }

    async function resolveThreadRoomKey(roomContext, roomId) {
        if (hasIncomingPendingRequest(roomContext)) return null;
        return requireRoomKey(roomId);
    }

    return {
        getRoomKey,
        requireRoomKey,
        contributeRoomKey,
        resolveThreadRoomKey,
        hasIncomingPendingRequest,
    };
}
