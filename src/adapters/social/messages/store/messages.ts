import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { rowToMessage } from "./row-mappers.js";
import { getMember } from "./rooms.js";
import type { MessageRow } from "./types.js";

export async function appendMessage(
    db: DbExecutor,
    input: {
        roomId: string;
        senderId: string;
        ciphertext: string;
        iv: string;
        authTag?: string;
        contentType?: string;
    },
): Promise<MessageRow> {
    const id = randomUUID();
    const nowIso = new Date().toISOString();
    return db.transaction(async (executor) => {
        await executor.executeCommand({
            option: "INSERT",
            table: "chat_messages",
            values: {
                id,
                chatroom_id: input.roomId,
                sender_id: input.senderId,
                ciphertext: input.ciphertext,
                iv: input.iv,
                auth_tag: input.authTag ?? "",
                content_type: input.contentType ?? "text/plain",
                created_at: nowIso,
            },
        });
        await executor.executeCommand({
            option: "UPDATE",
            table: "chatrooms",
            set: { updated_at: nowIso },
            where: [{ column: "id", value: input.roomId }],
        });
        const result = await executor.executeCommand({
            option: "SELECT",
            table: "chat_messages",
            where: [{ column: "id", value: id }],
        });
        return rowToMessage(result.rows![0]);
    });
}

export async function appendRoomEvent(
    db: DbExecutor,
    input: {
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
    },
): Promise<MessageRow> {
    const payload = JSON.stringify({
        eventType: input.eventType,
        subjectAccountId: input.subjectAccountId,
        subjectHandle: input.subjectHandle ?? null,
        subjectDisplayName: input.subjectDisplayName ?? null,
    });
    return appendMessage(db, {
        roomId: input.roomId,
        senderId: input.actorId,
        ciphertext: payload,
        iv: "",
        authTag: "",
        contentType: "application/vnd.cognis.room-event+json",
    });
}

export async function listMessages(
    db: DbExecutor,
    roomId: string,
    limit: number,
    before?: string,
): Promise<MessageRow[]> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "chat_messages",
        where: [
            { column: "chatroom_id", value: roomId },
            ...(before
                ? [
                      {
                          column: "created_at",
                          operator: "<" as const,
                          value: before,
                      },
                  ]
                : []),
        ],
        orderBy: [{ column: "created_at", direction: "DESC" }],
        limit,
    });
    return (result.rows ?? []).map((row) => rowToMessage(row));
}

export async function getMessage(
    db: DbExecutor,
    messageId: string,
): Promise<MessageRow | null> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "chat_messages",
        where: [{ column: "id", value: messageId }],
        limit: 1,
    });
    return result.rows?.[0] ? rowToMessage(result.rows[0]) : null;
}

export async function markRead(
    db: DbExecutor,
    roomId: string,
    accountId: string,
): Promise<void> {
    await db.executeCommand({
        option: "UPDATE",
        table: "chatroom_members",
        set: { last_read_at: new Date().toISOString() },
        where: [
            { column: "chatroom_id", value: roomId },
            { column: "account_id", value: accountId },
        ],
    });
}

export async function unreadCount(
    db: DbExecutor,
    roomId: string,
    accountId: string,
): Promise<number> {
    const member = await getMember(db, roomId, accountId);
    if (!member) {
        return 0;
    }
    const result = await db.executeCommand({
        option: "SELECT",
        table: "chat_messages",
        count: true,
        where: [
            { column: "chatroom_id", value: roomId },
            {
                column: "sender_id",
                operator: "!=",
                value: accountId,
            },
            ...(member.lastReadAt
                ? [
                      {
                          column: "created_at",
                          operator: ">",
                          value: member.lastReadAt,
                      },
                  ]
                : []),
        ],
    });
    return Number(result.rows?.[0]?.cnt ?? 0);
}

export async function setMuted(
    db: DbExecutor,
    roomId: string,
    accountId: string,
    muted: boolean,
): Promise<void> {
    await db.executeCommand({
        option: "UPDATE",
        table: "chatroom_members",
        set: { muted: muted ? 1 : 0 },
        where: [
            { column: "chatroom_id", value: roomId },
            { column: "account_id", value: accountId },
        ],
    });
}

export async function setArchived(
    db: DbExecutor,
    roomId: string,
    accountId: string,
    archived: boolean,
): Promise<void> {
    await db.executeCommand({
        option: "UPDATE",
        table: "chatroom_members",
        set: { archived: archived ? 1 : 0 },
        where: [
            { column: "chatroom_id", value: roomId },
            { column: "account_id", value: accountId },
        ],
    });
}
