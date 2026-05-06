import type { SupportedDbType } from "./account-store.js";
import { createHash } from "node:crypto";
import type { DbExecutor } from "./account-store.js";

function cacheKey(accountId: string, pageId: string) {
    return createHash("sha256").update(`${accountId}:${pageId}`).digest("hex");
}

export class DbUserPreferenceStore {
    constructor(
        private readonly db: DbExecutor,
        private readonly dbType: SupportedDbType,
    ) {}

    private placeholder(index: number) {
        return this.dbType === "postgresql" ? `$${index}` : "?";
    }

    async ensureSchema() {
        await this.db.execute(`CREATE TABLE IF NOT EXISTS user_preferences (
      pref_key VARCHAR(64) PRIMARY KEY,
      account_id VARCHAR(255) NOT NULL,
      page_id VARCHAR(255) NOT NULL,
      layout_json TEXT NOT NULL
    )`);
    }

    async get(accountId: string, pageId: string) {
        const key = cacheKey(accountId, pageId);
        const result = await this.db.execute(
            `SELECT layout_json FROM user_preferences WHERE pref_key = ${this.placeholder(1)}`,
            [key],
        );
        return result.rows?.[0]?.layout_json ?? null;
    }

    async set(accountId: string, pageId: string, layoutJson: string) {
        const key = cacheKey(accountId, pageId);
        const params = [key, accountId, pageId, layoutJson];

        if (this.dbType === "mariadb") {
            await this.db.execute(
                `INSERT INTO user_preferences (pref_key, account_id, page_id, layout_json)
         VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.placeholder(4)})
         ON DUPLICATE KEY UPDATE
           account_id = VALUES(account_id),
           page_id = VALUES(page_id),
           layout_json = VALUES(layout_json)`,
                params,
            );
            return;
        }

        await this.db.execute(
            `INSERT INTO user_preferences (pref_key, account_id, page_id, layout_json)
       VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.placeholder(4)})
       ON CONFLICT (pref_key) DO UPDATE SET
         account_id = EXCLUDED.account_id,
         page_id = EXCLUDED.page_id,
         layout_json = EXCLUDED.layout_json`,
            params,
        );
    }

    async clearUser(accountId: string) {
        await this.db.execute(
            `DELETE FROM user_preferences WHERE account_id = ${this.placeholder(1)}`,
            [accountId],
        );
    }
}
