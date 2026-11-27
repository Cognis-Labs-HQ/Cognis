import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { rowToMessageRequest } from "./row-mappers.js";
import type { MessageRequestRow, MessageRequestStatus } from "./types.js";

export async function findPendingMessageRequest(
    database: DbExecutor,
    fromAccountId: string,
    toAccountId: string,
): Promise<MessageRequestRow | null> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chat_message_requests",
        where: [
            { column: "from_account_id", value: fromAccountId },
            { column: "to_account_id", value: toAccountId },
            { column: "status", value: "pending" },
        ],
        orderBy: [{ column: "created_at", direction: "DESC" }],
        limit: 1,
    });
    return result.rows?.[0] ? rowToMessageRequest(result.rows[0]) : null;
}

export async function createMessageRequest(
    database: DbExecutor,
    input: {
        fromAccountId: string;
        toAccountId: string;
        note?: string | null;
        roomId?: string | null;
    },
): Promise<MessageRequestRow> {
    const id = randomUUID();
    const nowIso = new Date().toISOString();
    await database.executeCommand({
        option: "INSERT",
        table: "chat_message_requests",
        values: {
            id,
            from_account_id: input.fromAccountId,
            to_account_id: input.toAccountId,
            note: input.note ?? null,
            status: "pending",
            room_id: input.roomId ?? null,
            created_at: nowIso,
        },
    });
    const created = await database.executeCommand({
        option: "SELECT",
        table: "chat_message_requests",
        where: [{ column: "id", value: id }],
        limit: 1,
    });
    return rowToMessageRequest(created.rows![0]);
}

export async function getMessageRequest(
    database: DbExecutor,
    id: string,
): Promise<MessageRequestRow | null> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chat_message_requests",
        where: [{ column: "id", value: id }],
        limit: 1,
    });
    return result.rows?.[0] ? rowToMessageRequest(result.rows[0]) : null;
}

export async function getPendingRoomMessageRequest(
    database: DbExecutor,
    roomId: string,
): Promise<MessageRequestRow | null> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chat_message_requests",
        where: [
            { column: "room_id", value: roomId },
            { column: "status", value: "pending" },
        ],
        orderBy: [{ column: "created_at", direction: "DESC" }],
        limit: 1,
    });
    return result.rows?.[0] ? rowToMessageRequest(result.rows[0]) : null;
}

export async function getPendingIncomingRoomMessageRequest(
    database: DbExecutor,
    roomId: string,
    toAccountId: string,
): Promise<MessageRequestRow | null> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chat_message_requests",
        where: [
            { column: "room_id", value: roomId },
            { column: "to_account_id", value: toAccountId },
            { column: "status", value: "pending" },
        ],
        orderBy: [{ column: "created_at", direction: "DESC" }],
        limit: 1,
    });
    return result.rows?.[0] ? rowToMessageRequest(result.rows[0]) : null;
}

export async function listIncomingMessageRequests(
    database: DbExecutor,
    accountId: string,
): Promise<MessageRequestRow[]> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chat_message_requests",
        where: [
            { column: "to_account_id", value: accountId },
            { column: "status", value: "pending" },
        ],
        orderBy: [{ column: "created_at", direction: "DESC" }],
    });
    return (result.rows ?? []).map((row) => rowToMessageRequest(row));
}

export async function updateMessageRequestStatus(
    database: DbExecutor,
    id: string,
    status: MessageRequestStatus,
    roomId: string | null = null,
): Promise<void> {
    await database.executeCommand({
        option: "UPDATE",
        table: "chat_message_requests",
        set: {
            status,
            room_id: roomId,
            responded_at: new Date().toISOString(),
        },
        where: [{ column: "id", value: id }],
    });
}

export async function approvePendingRequestsBetween(
    database: DbExecutor,
    accountA: string,
    accountB: string,
    roomId: string,
): Promise<void> {
    const nowIso = new Date().toISOString();
    for (const [fromAccountId, toAccountId] of [
        [accountA, accountB],
        [accountB, accountA],
    ]) {
        await database.executeCommand({
            option: "UPDATE",
            table: "chat_message_requests",
            set: {
                status: "approved",
                room_id: roomId,
                responded_at: nowIso,
            },
            where: [
                { column: "from_account_id", value: fromAccountId },
                { column: "to_account_id", value: toAccountId },
                { column: "status", value: "pending" },
            ],
        });
    }
}

export async function hasApprovedMessageRequestBetween(
    database: DbExecutor,
    accountA: string,
    accountB: string,
): Promise<boolean> {
    for (const [fromAccountId, toAccountId] of [
        [accountA, accountB],
        [accountB, accountA],
    ]) {
        const result = await database.executeCommand({
            option: "SELECT",
            table: "chat_message_requests",
            where: [
                { column: "from_account_id", value: fromAccountId },
                { column: "to_account_id", value: toAccountId },
                { column: "status", value: "approved" },
            ],
            orderBy: [{ column: "created_at", direction: "DESC" }],
            limit: 1,
        });
        if (result.rows?.[0]) {
            return true;
        }
    }
    return false;
}
