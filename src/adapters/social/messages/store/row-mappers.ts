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

function readString(value: unknown, fallback = ""): string {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? fallback : value.toISOString();
    }
    return value == null ? fallback : String(value);
}

function readNullableString(value: unknown): string | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    return value == null ? null : String(value);
}

export function rowToRoom(row: Record<string, unknown>): RoomRow {
    return {
        id: readString(row.id),
        kind: row.kind as ChatroomKind,
        title: readNullableString(row.title),
        avatarKey: readNullableString(row.avatar_key),
        createdBy: readString(row.created_by),
        createdAt: readString(row.created_at),
        updatedAt: readString(row.updated_at),
    };
}

export function rowToMember(row: Record<string, unknown>): MemberRow {
    return {
        chatroomId: readString(row.chatroom_id),
        accountId: readString(row.account_id),
        role: row.role as MemberRole,
        joinedAt: readString(row.joined_at),
        lastReadAt: readNullableString(row.last_read_at),
        muted: Boolean(row.muted),
        archived: Boolean(row.archived),
    };
}

export function rowToMessage(row: Record<string, unknown>): MessageRow {
    return {
        id: readString(row.id),
        chatroomId: readString(row.chatroom_id),
        senderId: readString(row.sender_id),
        ciphertext: readString(row.ciphertext),
        iv: readString(row.iv),
        authTag: readString(row.auth_tag),
        contentType: readString(row.content_type, "text/plain"),
        createdAt: readString(row.created_at),
    };
}

export function rowToMessageRequest(
    row: Record<string, unknown>,
): MessageRequestRow {
    return {
        id: readString(row.id),
        fromAccountId: readString(row.from_account_id),
        toAccountId: readString(row.to_account_id),
        note: readNullableString(row.note),
        status: row.status as MessageRequestStatus,
        roomId: readNullableString(row.room_id),
        createdAt: readString(row.created_at),
        respondedAt: readNullableString(row.responded_at),
    };
}

export function rowToTyping(row: Record<string, unknown>): TypingRow {
    return {
        chatroomId: readString(row.chatroom_id),
        accountId: readString(row.account_id),
        typingUntil: readString(row.typing_until),
    };
}

export function rowToReaction(
    row: Record<string, unknown>,
): MessageReactionRow {
    return {
        chatroomId: readString(row.chatroom_id),
        messageId: readString(row.message_id),
        accountId: readString(row.account_id),
        emoji: readString(row.emoji),
        createdAt: readString(row.created_at),
    };
}

export function rowToEmojiUsage(row: Record<string, unknown>): EmojiUsageRow {
    return {
        accountId: readString(row.account_id),
        emoji: readString(row.emoji),
        usageCount: Number(row.usage_count ?? 0),
    };
}
