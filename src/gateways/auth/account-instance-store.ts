import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../shared.js";

export class AccountInstanceStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "auth_account_instances",
            columns: [
                {
                    name: "account_id",
                    type: "text",
                    notNull: true,
                    primaryKey: true,
                },
                { name: "instance_id", type: "text", notNull: true },
                { name: "created_at", type: "text", notNull: true },
            ],
        });
    }

    async getOrCreate(accountId: string): Promise<string> {
        const normalizedAccountId = accountId.trim().toLowerCase();
        const existing = await this.get(normalizedAccountId);
        if (existing) return existing;
        const instanceId = randomUUID();
        await this.db.executeCommand({
            option: "INSERT",
            table: "auth_account_instances",
            values: {
                account_id: normalizedAccountId,
                instance_id: instanceId,
                created_at: new Date().toISOString(),
            },
            conflict: { action: "ignore", target: ["account_id"] },
        });
        return (await this.get(normalizedAccountId)) ?? instanceId;
    }

    async delete(accountId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "auth_account_instances",
            where: [
                { column: "account_id", value: accountId.trim().toLowerCase() },
            ],
        });
    }

    private async get(accountId: string): Promise<string | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "auth_account_instances",
            columns: ["instance_id"],
            where: [{ column: "account_id", value: accountId }],
            limit: 1,
        });
        const instanceId = result.rows?.[0]?.instance_id;
        return typeof instanceId === "string" ? instanceId : null;
    }
}
