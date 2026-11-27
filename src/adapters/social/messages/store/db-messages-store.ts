import {
    changeChatroomSource,
    type ChatroomSourceInput,
} from "./source-binding.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import {
    appendMessage,
    appendRoomEvent,
    getMessage,
    listMessages,
    markRead,
    setArchived,
    setMuted,
    unreadCount,
    insertRoomEvent,
} from "./messages.js";
import {
    acknowledgeRoomKeyContribution,
    claimRoomKeyContribution,
    generateAndStoreRoomKey,
    getUnwrappedRoomKey,
    storeWrappedRoomKey,
} from "./keys.js";
import {
    addMember,
    createDm,
    createRoom,
    deleteRoom,
    deleteRoomForActor,
    findDmBetween,
    findGroupByExactMembers,
    getMember,
    getRoom,
    listMembers,
    listRoomsForAccount,
    removeMember,
    removeMemberAndApplyLifecycle,
    updateRoomAvatar,
    updateRoomTitle,
} from "./rooms.js";
import {
    approvePendingRequestsBetween,
    createMessageRequest,
    findPendingMessageRequest,
    getMessageRequest,
    getPendingIncomingRoomMessageRequest,
    getPendingRoomMessageRequest,
    hasApprovedMessageRequestBetween,
    listIncomingMessageRequests,
    updateMessageRequestStatus,
} from "./requests.js";
import { ensureSchema } from "./schema.js";
import {
    hasMessageReaction,
    listMessageReactions,
    setMessageReaction,
} from "./reactions.js";
import { getTopEmojiUsage, incrementEmojiUsage } from "./emoji.js";
import { listActiveTypers, setTyping } from "./typing.js";
import type {
    ChatroomKind,
    EmojiUsageRow,
    MemberRole,
    MemberRow,
    MessageReactionRow,
    MessageRequestRow,
    MessageRequestStatus,
    MessageRow,
    RoomRow,
    TypingRow,
} from "./types.js";

export class DbMessagesStore {
    constructor(private readonly database: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await ensureSchema(this.database);
    }

    async bindSource(input: ChatroomSourceInput): Promise<void> {
        await changeChatroomSource(this.database, input);
    }

    async releaseSource(
        input: ChatroomSourceInput,
        administrator = false,
    ): Promise<void> {
        await changeChatroomSource(this.database, input, true, administrator);
    }

    async createRoom(
        kind: ChatroomKind,
        title: string | null,
        createdBy: string,
    ): Promise<RoomRow> {
        return createRoom(this.database, kind, title, createdBy);
    }

    async createDm(accountA: string, accountB: string): Promise<RoomRow> {
        return createDm(this.database, accountA, accountB);
    }

    async getRoom(id: string): Promise<RoomRow | null> {
        return getRoom(this.database, id);
    }

    async deleteRoom(id: string): Promise<void> {
        await deleteRoom(this.database, id);
    }

    async deleteRoomForActor(
        roomId: string,
        actorAccountId: string,
    ): Promise<"deleted" | "forbidden" | "not_found"> {
        return deleteRoomForActor(this.database, roomId, actorAccountId);
    }

    async updateRoomAvatar(
        roomId: string,
        avatarKey: string | null,
    ): Promise<RoomRow | null> {
        return updateRoomAvatar(this.database, roomId, avatarKey);
    }

    async addMember(
        roomId: string,
        accountId: string,
        role: MemberRole,
    ): Promise<boolean> {
        return addMember(this.database, roomId, accountId, role);
    }

    async addMemberWithEvent(input: {
        roomId: string;
        actorId: string;
        accountId: string;
        role: MemberRole;
        handle?: string | null;
        displayName?: string | null;
    }): Promise<boolean> {
        return this.database.transaction(async (executor) => {
            const existingMember = await getMember(
                executor,
                input.roomId,
                input.accountId,
            );
            if (existingMember?.archived) {
                await setArchived(
                    executor,
                    input.roomId,
                    input.accountId,
                    false,
                );
            }
            const added = await addMember(
                executor,
                input.roomId,
                input.accountId,
                input.role,
            );
            if (!added && !existingMember?.archived) return false;
            await insertRoomEvent(executor, {
                roomId: input.roomId,
                actorId: input.actorId,
                eventType: "member_joined",
                subjectAccountId: input.accountId,
                subjectHandle: input.handle,
                subjectDisplayName: input.displayName,
            });
            return added;
        });
    }

    async removeMemberWithEvent(input: {
        roomId: string;
        actorId: string;
        accountId: string;
        handle?: string | null;
        displayName?: string | null;
    }): Promise<"active" | "archived" | "deleted" | "not_member"> {
        return this.database.transaction(async (executor) => {
            const member = await getMember(
                executor,
                input.roomId,
                input.accountId,
            );
            if (!member) return "not_member";
            await insertRoomEvent(executor, {
                roomId: input.roomId,
                actorId: input.actorId,
                eventType: "member_left",
                subjectAccountId: input.accountId,
                subjectHandle: input.handle,
                subjectDisplayName: input.displayName,
            });
            return removeMemberAndApplyLifecycle(
                executor,
                input.roomId,
                input.accountId,
            );
        });
    }

    async removeMember(roomId: string, accountId: string): Promise<void> {
        await removeMember(this.database, roomId, accountId);
    }

    async removeMemberAndApplyLifecycle(
        roomId: string,
        accountId: string,
    ): Promise<"active" | "archived" | "deleted"> {
        return removeMemberAndApplyLifecycle(this.database, roomId, accountId);
    }

    async getMember(
        roomId: string,
        accountId: string,
    ): Promise<MemberRow | null> {
        return getMember(this.database, roomId, accountId);
    }

    async listMembers(roomId: string): Promise<MemberRow[]> {
        return listMembers(this.database, roomId);
    }

    async listRoomsForAccount(accountId: string): Promise<RoomRow[]> {
        return listRoomsForAccount(this.database, accountId);
    }

    async findDmBetween(
        accountA: string,
        accountB: string,
    ): Promise<RoomRow | null> {
        return findDmBetween(this.database, accountA, accountB);
    }

    async updateRoomTitle(
        roomId: string,
        title: string | null,
    ): Promise<RoomRow | null> {
        return updateRoomTitle(this.database, roomId, title);
    }

    async findGroupByExactMembers(
        memberAccountIds: string[],
    ): Promise<RoomRow | null> {
        return findGroupByExactMembers(this.database, memberAccountIds);
    }

    async appendMessage(input: {
        roomId: string;
        senderId: string;
        ciphertext: string;
        iv: string;
        authTag?: string;
        contentType?: string;
        operationId?: string;
    }): Promise<MessageRow> {
        return appendMessage(this.database, input);
    }

    async appendRoomEvent(input: {
        roomId: string;
        actorId: string;
        eventType: string;
        subjectAccountId: string;
        subjectHandle?: string | null;
        subjectDisplayName?: string | null;
        details?: Record<string, unknown>;
    }): Promise<MessageRow> {
        return appendRoomEvent(this.database, input);
    }

    async listMessages(
        roomId: string,
        limit: number,
        before?: string,
    ): Promise<MessageRow[]> {
        return listMessages(this.database, roomId, limit, before);
    }

    async getMessage(messageId: string): Promise<MessageRow | null> {
        return getMessage(this.database, messageId);
    }

    async markRead(
        roomId: string,
        accountId: string,
        readAt?: string,
    ): Promise<void> {
        await markRead(this.database, roomId, accountId, readAt);
    }

    async unreadCount(roomId: string, accountId: string): Promise<number> {
        return unreadCount(this.database, roomId, accountId);
    }

    async setMuted(
        roomId: string,
        accountId: string,
        muted: boolean,
    ): Promise<void> {
        await setMuted(this.database, roomId, accountId, muted);
    }

    async setArchived(
        roomId: string,
        accountId: string,
        archived: boolean,
    ): Promise<void> {
        await setArchived(this.database, roomId, accountId, archived);
    }

    async findPendingMessageRequest(
        fromAccountId: string,
        toAccountId: string,
    ): Promise<MessageRequestRow | null> {
        return findPendingMessageRequest(
            this.database,
            fromAccountId,
            toAccountId,
        );
    }

    async createMessageRequest(input: {
        fromAccountId: string;
        toAccountId: string;
        note?: string | null;
        roomId?: string | null;
    }): Promise<MessageRequestRow> {
        return createMessageRequest(this.database, input);
    }

    async getMessageRequest(id: string): Promise<MessageRequestRow | null> {
        return getMessageRequest(this.database, id);
    }

    async getPendingRoomMessageRequest(
        roomId: string,
    ): Promise<MessageRequestRow | null> {
        return getPendingRoomMessageRequest(this.database, roomId);
    }

    async getPendingIncomingRoomMessageRequest(
        roomId: string,
        toAccountId: string,
    ): Promise<MessageRequestRow | null> {
        return getPendingIncomingRoomMessageRequest(
            this.database,
            roomId,
            toAccountId,
        );
    }

    async listIncomingMessageRequests(
        accountId: string,
    ): Promise<MessageRequestRow[]> {
        return listIncomingMessageRequests(this.database, accountId);
    }

    async updateMessageRequestStatus(
        id: string,
        status: MessageRequestStatus,
        roomId: string | null = null,
    ): Promise<void> {
        await updateMessageRequestStatus(this.database, id, status, roomId);
    }

    async approvePendingRequestsBetween(
        accountA: string,
        accountB: string,
        roomId: string,
    ): Promise<void> {
        await approvePendingRequestsBetween(
            this.database,
            accountA,
            accountB,
            roomId,
        );
    }

    async hasApprovedMessageRequestBetween(
        accountA: string,
        accountB: string,
    ): Promise<boolean> {
        return hasApprovedMessageRequestBetween(
            this.database,
            accountA,
            accountB,
        );
    }

    async setTyping(
        roomId: string,
        accountId: string,
        typing: boolean,
        ttlSeconds = 8,
    ): Promise<void> {
        await setTyping(this.database, roomId, accountId, typing, ttlSeconds);
    }

    async listActiveTypers(roomId: string): Promise<TypingRow[]> {
        return listActiveTypers(this.database, roomId);
    }

    async setMessageReaction(
        roomId: string,
        messageId: string,
        accountId: string,
        emoji: string,
        active: boolean,
    ): Promise<void> {
        await setMessageReaction(
            this.database,
            roomId,
            messageId,
            accountId,
            emoji,
            active,
        );
    }

    async hasMessageReaction(
        roomId: string,
        messageId: string,
        accountId: string,
        emoji: string,
    ): Promise<boolean> {
        return hasMessageReaction(
            this.database,
            roomId,
            messageId,
            accountId,
            emoji,
        );
    }

    async listMessageReactions(roomId: string): Promise<MessageReactionRow[]> {
        return listMessageReactions(this.database, roomId);
    }

    async storeWrappedRoomKey(
        roomId: string,
        plaintextKeyHex: string,
    ): Promise<void> {
        await storeWrappedRoomKey(this.database, roomId, plaintextKeyHex);
    }

    async getUnwrappedRoomKey(roomId: string): Promise<string | null> {
        return getUnwrappedRoomKey(this.database, roomId);
    }

    async generateAndStoreRoomKey(roomId: string): Promise<string> {
        return generateAndStoreRoomKey(this.database, roomId);
    }

    async claimRoomKeyContribution(
        roomId: string,
        accountId: string,
    ): Promise<string | null> {
        return claimRoomKeyContribution(this.database, roomId, accountId);
    }

    async acknowledgeRoomKeyContribution(
        roomId: string,
        accountId: string,
    ): Promise<void> {
        await acknowledgeRoomKeyContribution(this.database, roomId, accountId);
    }

    async incrementEmojiUsage(accountId: string, emoji: string): Promise<void> {
        await incrementEmojiUsage(this.database, accountId, emoji);
    }

    async getTopEmojiUsage(
        accountId: string,
        limit: number,
    ): Promise<EmojiUsageRow[]> {
        return getTopEmojiUsage(this.database, accountId, limit);
    }
}
