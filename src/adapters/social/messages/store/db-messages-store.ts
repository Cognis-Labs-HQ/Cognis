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
    claimRoomKeyContribution,
    generateAndStoreRoomKey,
    getUnwrappedRoomKey,
    storeWrappedRoomKey,
} from "./keys.js";
import {
    addMember,
    createDm,
    createRoom,
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
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await ensureSchema(this.db);
    }

    async createRoom(
        kind: ChatroomKind,
        title: string | null,
        createdBy: string,
    ): Promise<RoomRow> {
        return createRoom(this.db, kind, title, createdBy);
    }

    async createDm(accountA: string, accountB: string): Promise<RoomRow> {
        return createDm(this.db, accountA, accountB);
    }

    async getRoom(id: string): Promise<RoomRow | null> {
        return getRoom(this.db, id);
    }

    async updateRoomAvatar(
        roomId: string,
        avatarKey: string | null,
    ): Promise<RoomRow | null> {
        return updateRoomAvatar(this.db, roomId, avatarKey);
    }

    async addMember(
        roomId: string,
        accountId: string,
        role: MemberRole,
    ): Promise<boolean> {
        return addMember(this.db, roomId, accountId, role);
    }

    async addMemberWithEvent(input: {
        roomId: string;
        actorId: string;
        accountId: string;
        role: MemberRole;
        handle?: string | null;
        displayName?: string | null;
    }): Promise<boolean> {
        return this.db.transaction(async (executor) => {
            const added = await addMember(
                executor,
                input.roomId,
                input.accountId,
                input.role,
            );
            if (!added) return false;
            await insertRoomEvent(executor, {
                roomId: input.roomId,
                actorId: input.actorId,
                eventType: "member_joined",
                subjectAccountId: input.accountId,
                subjectHandle: input.handle,
                subjectDisplayName: input.displayName,
            });
            return true;
        });
    }

    async removeMemberWithEvent(input: {
        roomId: string;
        actorId: string;
        accountId: string;
        handle?: string | null;
        displayName?: string | null;
    }): Promise<"active" | "archived" | "deleted" | "not_member"> {
        return this.db.transaction(async (executor) => {
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
        await removeMember(this.db, roomId, accountId);
    }

    async removeMemberAndApplyLifecycle(
        roomId: string,
        accountId: string,
    ): Promise<"active" | "archived" | "deleted"> {
        return removeMemberAndApplyLifecycle(this.db, roomId, accountId);
    }

    async getMember(
        roomId: string,
        accountId: string,
    ): Promise<MemberRow | null> {
        return getMember(this.db, roomId, accountId);
    }

    async listMembers(roomId: string): Promise<MemberRow[]> {
        return listMembers(this.db, roomId);
    }

    async listRoomsForAccount(accountId: string): Promise<RoomRow[]> {
        return listRoomsForAccount(this.db, accountId);
    }

    async findDmBetween(
        accountA: string,
        accountB: string,
    ): Promise<RoomRow | null> {
        return findDmBetween(this.db, accountA, accountB);
    }

    async updateRoomTitle(
        roomId: string,
        title: string | null,
    ): Promise<RoomRow | null> {
        return updateRoomTitle(this.db, roomId, title);
    }

    async findGroupByExactMembers(
        memberAccountIds: string[],
    ): Promise<RoomRow | null> {
        return findGroupByExactMembers(this.db, memberAccountIds);
    }

    async appendMessage(input: {
        roomId: string;
        senderId: string;
        ciphertext: string;
        iv: string;
        authTag?: string;
        contentType?: string;
    }): Promise<MessageRow> {
        return appendMessage(this.db, input);
    }

    async appendRoomEvent(input: {
        roomId: string;
        actorId: string;
        eventType:
            | "member_joined"
            | "member_left"
            | "profile_display_name_changed"
            | "profile_avatar_changed";
        subjectAccountId: string;
        subjectHandle?: string | null;
        subjectDisplayName?: string | null;
    }): Promise<MessageRow> {
        return appendRoomEvent(this.db, input);
    }

    async listMessages(
        roomId: string,
        limit: number,
        before?: string,
    ): Promise<MessageRow[]> {
        return listMessages(this.db, roomId, limit, before);
    }

    async getMessage(messageId: string): Promise<MessageRow | null> {
        return getMessage(this.db, messageId);
    }

    async markRead(roomId: string, accountId: string): Promise<void> {
        await markRead(this.db, roomId, accountId);
    }

    async unreadCount(roomId: string, accountId: string): Promise<number> {
        return unreadCount(this.db, roomId, accountId);
    }

    async setMuted(
        roomId: string,
        accountId: string,
        muted: boolean,
    ): Promise<void> {
        await setMuted(this.db, roomId, accountId, muted);
    }

    async setArchived(
        roomId: string,
        accountId: string,
        archived: boolean,
    ): Promise<void> {
        await setArchived(this.db, roomId, accountId, archived);
    }

    async findPendingMessageRequest(
        fromAccountId: string,
        toAccountId: string,
    ): Promise<MessageRequestRow | null> {
        return findPendingMessageRequest(this.db, fromAccountId, toAccountId);
    }

    async createMessageRequest(input: {
        fromAccountId: string;
        toAccountId: string;
        note?: string | null;
        roomId?: string | null;
    }): Promise<MessageRequestRow> {
        return createMessageRequest(this.db, input);
    }

    async getMessageRequest(id: string): Promise<MessageRequestRow | null> {
        return getMessageRequest(this.db, id);
    }

    async getPendingRoomMessageRequest(
        roomId: string,
    ): Promise<MessageRequestRow | null> {
        return getPendingRoomMessageRequest(this.db, roomId);
    }

    async getPendingIncomingRoomMessageRequest(
        roomId: string,
        toAccountId: string,
    ): Promise<MessageRequestRow | null> {
        return getPendingIncomingRoomMessageRequest(
            this.db,
            roomId,
            toAccountId,
        );
    }

    async listIncomingMessageRequests(
        accountId: string,
    ): Promise<MessageRequestRow[]> {
        return listIncomingMessageRequests(this.db, accountId);
    }

    async updateMessageRequestStatus(
        id: string,
        status: MessageRequestStatus,
        roomId: string | null = null,
    ): Promise<void> {
        await updateMessageRequestStatus(this.db, id, status, roomId);
    }

    async approvePendingRequestsBetween(
        accountA: string,
        accountB: string,
        roomId: string,
    ): Promise<void> {
        await approvePendingRequestsBetween(
            this.db,
            accountA,
            accountB,
            roomId,
        );
    }

    async hasApprovedMessageRequestBetween(
        accountA: string,
        accountB: string,
    ): Promise<boolean> {
        return hasApprovedMessageRequestBetween(this.db, accountA, accountB);
    }

    async setTyping(
        roomId: string,
        accountId: string,
        typing: boolean,
        ttlSeconds = 8,
    ): Promise<void> {
        await setTyping(this.db, roomId, accountId, typing, ttlSeconds);
    }

    async listActiveTypers(roomId: string): Promise<TypingRow[]> {
        return listActiveTypers(this.db, roomId);
    }

    async setMessageReaction(
        roomId: string,
        messageId: string,
        accountId: string,
        emoji: string,
        active: boolean,
    ): Promise<void> {
        await setMessageReaction(
            this.db,
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
        return hasMessageReaction(this.db, roomId, messageId, accountId, emoji);
    }

    async listMessageReactions(roomId: string): Promise<MessageReactionRow[]> {
        return listMessageReactions(this.db, roomId);
    }

    async storeWrappedRoomKey(
        roomId: string,
        plaintextKeyHex: string,
    ): Promise<void> {
        await storeWrappedRoomKey(this.db, roomId, plaintextKeyHex);
    }

    async getUnwrappedRoomKey(roomId: string): Promise<string | null> {
        return getUnwrappedRoomKey(this.db, roomId);
    }

    async generateAndStoreRoomKey(roomId: string): Promise<string> {
        return generateAndStoreRoomKey(this.db, roomId);
    }

    async claimRoomKeyContribution(
        roomId: string,
        accountId: string,
    ): Promise<string | null> {
        return claimRoomKeyContribution(this.db, roomId, accountId);
    }

    async incrementEmojiUsage(accountId: string, emoji: string): Promise<void> {
        await incrementEmojiUsage(this.db, accountId, emoji);
    }

    async getTopEmojiUsage(
        accountId: string,
        limit: number,
    ): Promise<EmojiUsageRow[]> {
        return getTopEmojiUsage(this.db, accountId, limit);
    }
}
