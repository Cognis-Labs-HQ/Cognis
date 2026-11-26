import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { rowToEmojiUsage } from "./row-mappers.js";
import type { EmojiUsageRow } from "./types.js";

export async function incrementEmojiUsage(
    db: DbExecutor,
    accountId: string,
    emoji: string,
): Promise<void> {
    await db.transaction(async (tx) => {
        const existing = await tx.executeCommand({
            option: "SELECT",
            table: "chat_emoji_usage",
            where: [
                { column: "account_id", value: accountId },
                { column: "emoji", value: emoji },
            ],
            limit: 1,
        });
        const currentRow = existing.rows?.[0];
        if (currentRow) {
            await tx.executeCommand({
                option: "UPDATE",
                table: "chat_emoji_usage",
                set: {
                    usage_count: Number(currentRow.usage_count ?? 0) + 1,
                },
                where: [
                    { column: "account_id", value: accountId },
                    { column: "emoji", value: emoji },
                ],
            });
            return;
        }

        await tx.executeCommand({
            option: "INSERT",
            table: "chat_emoji_usage",
            values: { account_id: accountId, emoji, usage_count: 1 },
            conflict: { action: "ignore" },
        });
    });
}

export async function getTopEmojiUsage(
    db: DbExecutor,
    accountId: string,
    limit: number,
): Promise<EmojiUsageRow[]> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "chat_emoji_usage",
        where: [{ column: "account_id", value: accountId }],
        orderBy: [{ column: "usage_count", direction: "DESC" }],
        limit,
    });
    return (result.rows ?? []).map((row) => rowToEmojiUsage(row));
}
