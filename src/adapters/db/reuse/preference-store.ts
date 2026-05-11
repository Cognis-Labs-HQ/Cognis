import { createHash } from "node:crypto";
import type { DbExecutor } from "./account-store.js";

function cacheKey(accountId: string, pageId: string) {
    return createHash("sha256").update(`${accountId}:${pageId}`).digest("hex");
}

export class DbUserPreferenceStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema() {
        await this.db.ensureTable({
            name: "user_preferences",
            columns: [
                { name: "pref_key", type: "text", notNull: true, primaryKey: true },
                { name: "account_id", type: "text", notNull: true },
                { name: "page_id", type: "text", notNull: true },
                { name: "layout_json", type: "text", notNull: true },
            ],
        });
    }

    async get(accountId: string, pageId: string) {
        const key = cacheKey(accountId, pageId);
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "user_preferences",
            columns: ["layout_json"],
            where: [{ column: "pref_key", value: key }],
            limit: 1,
        });
        return result.rows?.[0]?.layout_json ?? null;
    }

    async set(accountId: string, pageId: string, layoutJson: string) {
        const key = cacheKey(accountId, pageId);
        await this.db.executeCommand({
            option: "INSERT",
            table: "user_preferences",
            values: {
                pref_key: key,
                account_id: accountId,
                page_id: pageId,
                layout_json: layoutJson,
            },
            conflict: {
                action: "update",
                target: ["pref_key"],
                update: {
                    account_id: accountId,
                    page_id: pageId,
                    layout_json: layoutJson,
                },
            },
        });
    }

    async clearUser(accountId: string) {
        await this.db.executeCommand({
            option: "DELETE",
            table: "user_preferences",
            where: [{ column: "account_id", value: accountId }],
        });
    }
}
