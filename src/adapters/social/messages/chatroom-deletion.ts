import type { DbMessagesStore } from "./store.js";

class ChatroomDeletionRequestError extends Error {}

export function createChatroomDeletionCapability(
    store: DbMessagesStore,
    log?: (
        level: string,
        message: string,
        metadata?: Record<string, unknown>,
    ) => void,
    resolveActorRole?: (accountId: string) => Promise<string | null>,
) {
    return async function deleteChatroom(input: {
        roomId?: unknown;
        actorAccountId?: unknown;
    }): Promise<void> {
        const roomId = String(input?.roomId ?? "").trim();
        const actorAccountId = String(input?.actorAccountId ?? "").trim();
        if (!roomId) {
            throw new ChatroomDeletionRequestError("roomId is required.");
        }
        if (!actorAccountId) {
            throw new ChatroomDeletionRequestError(
                "actorAccountId is required.",
            );
        }

        try {
            await store.ensureSchema();
            const role = await resolveActorRole?.(actorAccountId);
            const administrator = role === "admin" || role === "owner";
            let result: "deleted" | "not_found" | "forbidden";
            if (administrator) {
                const room = await store.getRoom(roomId);
                result = room ? "deleted" : "not_found";
                if (room) await store.deleteRoom(roomId);
            } else {
                result = await store.deleteRoomForActor(roomId, actorAccountId);
            }
            if (result === "not_found") {
                throw new ChatroomDeletionRequestError("Chatroom not found.");
            }
            if (result === "forbidden") {
                throw new ChatroomDeletionRequestError(
                    "Only the chatroom owner or sole participant can delete the chatroom.",
                );
            }
            log?.("info", "Chatroom deleted.", {
                component: "social-messages-adapter",
                operation: "delete_chatroom",
                roomId,
                actorAccountId,
            });
        } catch (error) {
            if (error instanceof ChatroomDeletionRequestError) throw error;
            log?.("error", "Chatroom deletion failed.", {
                component: "social-messages-adapter",
                operation: "delete_chatroom",
                roomId,
                actorAccountId,
                error: error instanceof Error ? error.message : String(error),
            });
            throw new Error("Chatroom could not be deleted.");
        }
    };
}
