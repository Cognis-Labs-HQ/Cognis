import type { DbMessagesStore } from "./store.js";

class ChatroomDeletionRequestError extends Error {}

export function createChatroomDeletionCapability(
    store: DbMessagesStore,
    log?: (
        level: string,
        message: string,
        metadata?: Record<string, unknown>,
    ) => void,
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
            const room = await store.getRoom(roomId);
            if (!room) {
                throw new ChatroomDeletionRequestError("Chatroom not found.");
            }
            const members = await store.listMembers(roomId);
            const isOwner = room.createdBy === actorAccountId;
            const isSoleParticipant =
                members.length === 1 &&
                members[0]?.accountId === actorAccountId;
            if (!isOwner && !isSoleParticipant) {
                throw new ChatroomDeletionRequestError(
                    "Only the chatroom owner or sole participant can delete the chatroom.",
                );
            }

            await store.deleteRoom(roomId);
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
