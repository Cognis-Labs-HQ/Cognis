import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { rowToTyping } from "./row-mappers.js";
import type { TypingRow } from "./types.js";

export async function setTyping(
    database: DbExecutor,
    roomId: string,
    accountId: string,
    typing: boolean,
    ttlSeconds = 8,
): Promise<void> {
    if (!typing) {
        await database.executeCommand({
            option: "DELETE",
            table: "chatroom_typing",
            where: [
                { column: "chatroom_id", value: roomId },
                { column: "account_id", value: accountId },
            ],
        });
        return;
    }

    const untilIso = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await database.executeCommand({
        option: "INSERT",
        table: "chatroom_typing",
        values: {
            chatroom_id: roomId,
            account_id: accountId,
            typing_until: untilIso,
        },
        conflict: {
            action: "update",
            target: ["chatroom_id", "account_id"],
        },
    });
}

export async function listActiveTypers(
    database: DbExecutor,
    roomId: string,
): Promise<TypingRow[]> {
    const nowIso = new Date().toISOString();
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chatroom_typing",
        where: [
            { column: "chatroom_id", value: roomId },
            { column: "typing_until", operator: ">", value: nowIso },
        ],
        orderBy: [{ column: "typing_until", direction: "DESC" }],
    });
    return (result.rows ?? []).map((row) => rowToTyping(row));
}
