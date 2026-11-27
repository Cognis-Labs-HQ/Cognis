import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { rowToMessage } from "./row-mappers.js";
import { getMember } from "./rooms.js";
import type { MessageRow } from "./types.js";

export async function appendMessage(
    database: DbExecutor,
    input: {
        roomId: string;
        senderId: string;
        ciphertext: string;
        iv: string;
        authTag?: string;
        contentType?: string;
        operationId?: string;
    },
): Promise<MessageRow> {
    return database.transaction((executor) => insertMessage(executor, input));
}

async function insertMessage(
    database: DbExecutor,
    input: {
        roomId: string;
        senderId: string;
        ciphertext: string;
        iv: string;
        authTag?: string;
        contentType?: string;
        operationId?: string;
    },
): Promise<MessageRow> {
    const id = input.operationId ?? randomUUID();
    const nowIso = new Date().toISOString();
    const inserted = await database.executeCommand({
        option: "INSERT",
        table: "chat_messages",
        conflict: { action: "ignore", target: ["id"] },
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
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chat_messages",
        where: [{ column: "id", value: id }],
    });
    const message = rowToMessage(result.rows![0]);
    if (
        message.chatroomId !== input.roomId ||
        message.senderId !== input.senderId ||
        message.ciphertext !== input.ciphertext ||
        message.iv !== input.iv ||
        message.authTag !== (input.authTag ?? "") ||
        message.contentType !== (input.contentType ?? "text/plain")
    )
        throw Object.assign(new Error("delivery_conflict"), { status: 409 });
    if (inserted.rowCount === 0) return { ...message, replayed: true };
    await database.executeCommand({
        option: "UPDATE",
        table: "chatrooms",
        set: { updated_at: nowIso },
        where: [{ column: "id", value: input.roomId }],
    });
    return message;
}

export async function appendRoomEvent(
    database: DbExecutor,
    input: {
        roomId: string;
        actorId: string;
        eventType: string;
        subjectAccountId: string;
        subjectHandle?: string | null;
        subjectDisplayName?: string | null;
        details?: Record<string, unknown>;
    },
): Promise<MessageRow> {
    return database.transaction((executor) => insertRoomEvent(executor, input));
}

export async function insertRoomEvent(
    database: DbExecutor,
    input: {
        roomId: string;
        actorId: string;
        eventType: string;
        subjectAccountId: string;
        subjectHandle?: string | null;
        subjectDisplayName?: string | null;
        details?: Record<string, unknown>;
    },
): Promise<MessageRow> {
    const payload = JSON.stringify({
        eventType: input.eventType,
        subjectAccountId: input.subjectAccountId,
        subjectHandle: input.subjectHandle ?? null,
        subjectDisplayName: input.subjectDisplayName ?? null,
        ...(input.details ?? {}),
    });
    return insertMessage(database, {
        roomId: input.roomId,
        senderId: input.actorId,
        ciphertext: payload,
        iv: "",
        authTag: "",
        contentType: "application/vnd.cognis.room-event+json",
    });
}

export async function listMessages(
    database: DbExecutor,
    roomId: string,
    limit: number,
    before?: string,
): Promise<MessageRow[]> {
    const result = await database.executeCommand({
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
    database: DbExecutor,
    messageId: string,
): Promise<MessageRow | null> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chat_messages",
        where: [{ column: "id", value: messageId }],
        limit: 1,
    });
    return result.rows?.[0] ? rowToMessage(result.rows[0]) : null;
}

export async function markRead(
    database: DbExecutor,
    roomId: string,
    accountId: string,
    readAt = new Date().toISOString(),
): Promise<void> {
    await database.transaction(async (executor) => {
        const member = await getMember(executor, roomId, accountId);
        if (
            !member ||
            (member.lastReadAt &&
                Date.parse(member.lastReadAt) >= Date.parse(readAt))
        )
            return;
        await executor.executeCommand({
            option: "UPDATE",
            table: "chatroom_members",
            set: { last_read_at: readAt },
            where: [
                { column: "chatroom_id", value: roomId },
                { column: "account_id", value: accountId },
            ],
        });
    });
}

export async function unreadCount(
    database: DbExecutor,
    roomId: string,
    accountId: string,
): Promise<number> {
    const member = await getMember(database, roomId, accountId);
    if (!member) {
        return 0;
    }
    const result = await database.executeCommand({
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
    database: DbExecutor,
    roomId: string,
    accountId: string,
    muted: boolean,
): Promise<void> {
    await database.executeCommand({
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
    database: DbExecutor,
    roomId: string,
    accountId: string,
    archived: boolean,
): Promise<void> {
    await database.executeCommand({
        option: "UPDATE",
        table: "chatroom_members",
        set: { archived: archived ? 1 : 0 },
        where: [
            { column: "chatroom_id", value: roomId },
            { column: "account_id", value: accountId },
        ],
    });
}
