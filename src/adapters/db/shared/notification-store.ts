import type { DbExecutor, SupportedDbType } from "./account-store.js";
import type { NotificationPreferenceStore } from "../../../gateways/notify/gateway.js";

export interface NotificationConfigStore {
    getConfig(senderId: string): Promise<Record<string, unknown> | null>;
    saveConfig(
        senderId: string,
        config: Record<string, unknown>,
    ): Promise<void>;
}

export class DbNotificationStore implements NotificationConfigStore {
    constructor(
        private readonly db: DbExecutor,
        private readonly dbType: SupportedDbType,
    ) {}

    private placeholder(index: number): string {
        return this.dbType === "postgresql" ? `$${index}` : "?";
    }

    async ensureSchema(): Promise<void> {
        await this.db
            .execute(`CREATE TABLE IF NOT EXISTS notification_provider_configs (
      sender_id VARCHAR(191) PRIMARY KEY,
      config_json TEXT NOT NULL
    )`);
        await this.db
            .execute(`CREATE TABLE IF NOT EXISTS user_notification_prefs (
      account_id VARCHAR(191) NOT NULL,
      category VARCHAR(191) NOT NULL,
      sender_id VARCHAR(191) NOT NULL,
      PRIMARY KEY (account_id, category, sender_id)
    )`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS user_emails (
      account_id VARCHAR(191) NOT NULL,
      email VARCHAR(320) NOT NULL,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      PRIMARY KEY (account_id, email),
      UNIQUE (email)
    )`);
    }

    async getConfig(senderId: string): Promise<Record<string, unknown> | null> {
        const result = await this.db.execute(
            `SELECT config_json FROM notification_provider_configs WHERE sender_id = ${this.placeholder(1)}`,
            [senderId],
        );
        const row = result.rows?.[0];
        if (!row) return null;
        return JSON.parse(row.config_json) as Record<string, unknown>;
    }

    async saveConfig(
        senderId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const json = JSON.stringify(config);
        if (this.dbType === "mariadb") {
            await this.db.execute(
                `INSERT INTO notification_provider_configs (sender_id, config_json)
         VALUES (${this.placeholder(1)}, ${this.placeholder(2)})
         ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)`,
                [senderId, json],
            );
            return;
        }
        await this.db.execute(
            `INSERT INTO notification_provider_configs (sender_id, config_json)
       VALUES (${this.placeholder(1)}, ${this.placeholder(2)})
       ON CONFLICT (sender_id) DO UPDATE SET config_json = EXCLUDED.config_json`,
            [senderId, json],
        );
    }

    async getUserNotifPrefs(
        accountId: string,
    ): Promise<Array<{ category: string; senderId: string }>> {
        const result = await this.db.execute(
            `SELECT category, sender_id FROM user_notification_prefs WHERE account_id = ${this.placeholder(1)}`,
            [accountId],
        );
        return (result.rows ?? []).map((row) => ({
            category: row.category as string,
            senderId: row.sender_id as string,
        }));
    }

    async saveUserNotifPrefs(
        accountId: string,
        prefs: Array<{ category: string; senderId: string; enabled: boolean }>,
    ): Promise<void> {
        await this.db.execute(
            `DELETE FROM user_notification_prefs WHERE account_id = ${this.placeholder(1)}`,
            [accountId],
        );
        for (const pref of prefs) {
            if (!pref.enabled) continue;
            if (this.dbType === "mariadb") {
                await this.db.execute(
                    `INSERT IGNORE INTO user_notification_prefs (account_id, category, sender_id)
           VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)})`,
                    [accountId, pref.category, pref.senderId],
                );
            } else if (this.dbType === "postgresql") {
                await this.db.execute(
                    `INSERT INTO user_notification_prefs (account_id, category, sender_id)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                    [accountId, pref.category, pref.senderId],
                );
            } else {
                await this.db.execute(
                    `INSERT OR IGNORE INTO user_notification_prefs (account_id, category, sender_id)
           VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)})`,
                    [accountId, pref.category, pref.senderId],
                );
            }
        }
    }

    async getUserEmails(
        accountId: string,
    ): Promise<Array<{ email: string; primary: boolean; verified: boolean }>> {
        const result = await this.db.execute(
            `SELECT email, is_primary, verified FROM user_emails WHERE account_id = ${this.placeholder(1)} ORDER BY is_primary DESC, email ASC`,
            [accountId],
        );
        return (result.rows ?? []).map((row) => ({
            email: row.email as string,
            primary: Boolean(row.is_primary),
            verified: Boolean(row.verified),
        }));
    }

    async addUserEmail(
        accountId: string,
        email: string,
        isPrimary = false,
    ): Promise<void> {
        const existing = await this.getUserEmails(accountId);
        const effectiveIsPrimary = isPrimary || existing.length === 0;
        if (effectiveIsPrimary) {
            await this.db.execute(
                `UPDATE user_emails SET is_primary = FALSE WHERE account_id = ${this.placeholder(1)}`,
                [accountId],
            );
        }
        if (this.dbType === "mariadb") {
            await this.db.execute(
                `INSERT IGNORE INTO user_emails (account_id, email, is_primary, verified)
         VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, FALSE)`,
                [accountId, email, effectiveIsPrimary],
            );
        } else if (this.dbType === "postgresql") {
            await this.db.execute(
                `INSERT INTO user_emails (account_id, email, is_primary, verified)
         VALUES ($1, $2, $3, FALSE) ON CONFLICT DO NOTHING`,
                [accountId, email, effectiveIsPrimary],
            );
        } else {
            await this.db.execute(
                `INSERT OR IGNORE INTO user_emails (account_id, email, is_primary, verified)
         VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, 0)`,
                [accountId, email, effectiveIsPrimary],
            );
        }
    }

    async verifyUserEmail(accountId: string, email: string): Promise<void> {
        await this.db.execute(
            `UPDATE user_emails SET verified = TRUE WHERE account_id = ${this.placeholder(1)} AND email = ${this.placeholder(2)}`,
            [accountId, email],
        );
        const emails = await this.getUserEmails(accountId);
        if (
            emails.length === 1 &&
            emails[0].email === email &&
            !emails[0].primary
        ) {
            await this.setPrimaryEmail(accountId, email);
        }
    }

    async removeUserEmail(accountId: string, email: string): Promise<void> {
        const existing = await this.getUserEmails(accountId);
        if (existing.length <= 1) {
            throw new Error("cannot_remove_last_email");
        }
        const target = existing.find((e) => e.email === email);
        if (target?.primary) {
            throw new Error("cannot_remove_primary_email");
        }
        await this.db.execute(
            `DELETE FROM user_emails WHERE account_id = ${this.placeholder(1)} AND email = ${this.placeholder(2)}`,
            [accountId, email],
        );
    }

    async removeUnverifiedEmail(
        accountId: string,
        email: string,
    ): Promise<void> {
        const existing = await this.getUserEmails(accountId);
        const target = existing.find((e) => e.email === email);
        if (!target) return;
        if (target.verified) {
            throw new Error("cannot_remove_verified_email");
        }
        await this.db.execute(
            `DELETE FROM user_emails WHERE account_id = ${this.placeholder(1)} AND email = ${this.placeholder(2)}`,
            [accountId, email],
        );
    }

    async isEmailRegisteredByOtherUser(
        email: string,
        excludeAccountId: string,
    ): Promise<boolean> {
        const result = await this.db.execute(
            `SELECT account_id FROM user_emails WHERE email = ${this.placeholder(1)} AND account_id != ${this.placeholder(2)} LIMIT 1`,
            [email, excludeAccountId],
        );
        return (result.rows?.length ?? 0) > 0;
    }

    async getPrimaryEmail(accountId: string): Promise<string | null> {
        const emails = await this.getUserEmails(accountId);
        return emails.find((e) => e.primary && e.verified)?.email ?? null;
    }

    async setPrimaryEmail(accountId: string, email: string): Promise<void> {
        await this.db.execute(
            `UPDATE user_emails SET is_primary = FALSE WHERE account_id = ${this.placeholder(1)}`,
            [accountId],
        );
        await this.db.execute(
            `UPDATE user_emails SET is_primary = TRUE WHERE account_id = ${this.placeholder(1)} AND email = ${this.placeholder(2)}`,
            [accountId, email],
        );
    }
}

export class DbNotificationPreferenceStore implements NotificationPreferenceStore {
    constructor(private readonly store: DbNotificationStore) {}

    async getSenderIds(
        recipientUsername: string,
        category: string,
    ): Promise<string[]> {
        const prefs = await this.store.getUserNotifPrefs(recipientUsername);
        return prefs
            .filter((pref) => pref.category === category)
            .map((pref) => pref.senderId);
    }
}
