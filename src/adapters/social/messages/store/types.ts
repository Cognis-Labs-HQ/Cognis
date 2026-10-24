export type ChatroomKind = "dm" | "group" | "classroom";
export type MemberRole = "owner" | "admin" | "member";

export interface RoomRow {
    id: string;
    kind: ChatroomKind;
    title: string | null;
    avatarKey: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface MemberRow {
    chatroomId: string;
    accountId: string;
    role: MemberRole;
    joinedAt: string;
    lastReadAt: string | null;
    keyDeliveredAt: string | null;
    muted: boolean;
    archived: boolean;
}

export interface MessageRow {
    id: string;
    chatroomId: string;
    senderId: string;
    ciphertext: string;
    iv: string;
    authTag: string;
    contentType: string;
    createdAt: string;
}

export type MessageRequestStatus =
    "pending" | "approved" | "rejected" | "cancelled";

export interface MessageRequestRow {
    id: string;
    fromAccountId: string;
    toAccountId: string;
    note: string | null;
    status: MessageRequestStatus;
    roomId: string | null;
    createdAt: string;
    respondedAt: string | null;
}

export interface TypingRow {
    chatroomId: string;
    accountId: string;
    typingUntil: string;
}

export interface MessageReactionRow {
    chatroomId: string;
    messageId: string;
    accountId: string;
    emoji: string;
    createdAt: string;
}

export interface EmojiUsageRow {
    accountId: string;
    emoji: string;
    usageCount: number;
}
