import type { DbExecutor } from "./account-store.js";
import type { NotificationPreferenceStore } from "../../../gateways/notify/gateway.js";

export interface NotificationConfigStore {
    getConfig(senderId: string): Promise<Record<string, unknown> | null>;
    saveConfig(
        senderId: string,
        config: Record<string, unknown>,
    ): Promise<void>;
}

export class DbNotificationStore implements NotificationConfigStore {
    constructor(private readonly db: DbExecutor) {}

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
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "notification_provider_configs",
            columns: ["config_json"],
            where: [{ column: "sender_id", value: senderId }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return null;
        return JSON.parse(row.config_json) as Record<string, unknown>;
    }

    async saveConfig(
        senderId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const json = JSON.stringify(config);
        await this.db.executeCommand({
            option: "INSERT",
            table: "notification_provider_configs",
            values: {
                sender_id: senderId,
                config_json: json,
            },
            conflict: {
                action: "update",
                target: ["sender_id"],
                update: {
                    config_json: json,
                },
            },
        });
    }

    async getUserNotifPrefs(
        accountId: string,
    ): Promise<Array<{ category: string; senderId: string }>> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "user_notification_prefs",
            columns: ["category", "sender_id"],
            where: [{ column: "account_id", value: accountId }],
        });
        return (result.rows ?? []).map((row) => ({
            category: row.category as string,
            senderId: row.sender_id as string,
        }));
    }

    async saveUserNotifPrefs(
        accountId: string,
        prefs: Array<{ category: string; senderId: string; enabled: boolean }>,
    ): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "user_notification_prefs",
            where: [{ column: "account_id", value: accountId }],
        });
        for (const pref of prefs) {
            if (!pref.enabled) continue;
            await this.db.executeCommand({
                option: "INSERT",
                table: "user_notification_prefs",
                values: {
                    account_id: accountId,
                    category: pref.category,
                    sender_id: pref.senderId,
                },
                conflict: {
                    action: "ignore",
                },
            });
        }
    }

    async getUserEmails(
        accountId: string,
    ): Promise<Array<{ email: string; primary: boolean; verified: boolean }>> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "user_emails",
            columns: ["email", "is_primary", "verified"],
            where: [{ column: "account_id", value: accountId }],
            orderBy: [
                { column: "is_primary", direction: "DESC" },
                { column: "email", direction: "ASC" },
            ],
        });
        return (result.rows ?? []).map((row) => ({
            email: row.email as string,
            primary: Boolean(row.is_primary),
            verified: Boolean(row.verified),
        }));
    }

    async hasVerifiedEmail(accountId: string): Promise<boolean> {
        const emails = await this.getUserEmails(accountId);
        return emails.some((e) => e.verified);
    }

    async addUserEmail(
        accountId: string,
        email: string,
        isPrimary = false,
    ): Promise<void> {
        const existing = await this.getUserEmails(accountId);
        const effectiveIsPrimary = isPrimary || existing.length === 0;
        if (effectiveIsPrimary) {
            await this.db.executeCommand({
                option: "UPDATE",
                table: "user_emails",
                set: { is_primary: false },
                where: [{ column: "account_id", value: accountId }],
            });
        }
        await this.db.executeCommand({
            option: "INSERT",
            table: "user_emails",
            values: {
                account_id: accountId,
                email,
                is_primary: effectiveIsPrimary,
                verified: false,
            },
            conflict: {
                action: "ignore",
            },
        });
    }

    async verifyUserEmail(accountId: string, email: string): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "user_emails",
            set: { verified: true },
            where: [
                { column: "account_id", value: accountId },
                { column: "email", value: email },
            ],
        });
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
        await this.db.executeCommand({
            option: "DELETE",
            table: "user_emails",
            where: [
                { column: "account_id", value: accountId },
                { column: "email", value: email },
            ],
        });
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
        await this.db.executeCommand({
            option: "DELETE",
            table: "user_emails",
            where: [
                { column: "account_id", value: accountId },
                { column: "email", value: email },
            ],
        });
    }

    async isEmailRegisteredByOtherUser(
        email: string,
        excludeAccountId: string,
    ): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "user_emails",
            columns: ["account_id"],
            where: [
                { column: "email", value: email },
                {
                    column: "account_id",
                    operator: "!=",
                    value: excludeAccountId,
                },
            ],
            limit: 1,
        });
        return (result.rows?.length ?? 0) > 0;
    }

    async isEmailRegistered(email: string): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "user_emails",
            columns: ["account_id"],
            where: [{ column: "email", value: email }],
            limit: 1,
        });
        return (result.rows?.length ?? 0) > 0;
    }

    async getPrimaryEmail(accountId: string): Promise<string | null> {
        const emails = await this.getUserEmails(accountId);
        return emails.find((e) => e.primary && e.verified)?.email ?? null;
    }

    async setPrimaryEmail(accountId: string, email: string): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "user_emails",
            set: { is_primary: false },
            where: [{ column: "account_id", value: accountId }],
        });
        await this.db.executeCommand({
            option: "UPDATE",
            table: "user_emails",
            set: { is_primary: true },
            where: [
                { column: "account_id", value: accountId },
                { column: "email", value: email },
            ],
        });
    }

    async upsertVerifiedPrimaryEmail(
        accountId: string,
        email: string,
    ): Promise<void> {
        const takenByOther = await this.isEmailRegisteredByOtherUser(
            email,
            accountId,
        );
        if (takenByOther) {
            throw new Error("email_taken");
        }

        await this.db.executeCommand({
            option: "UPDATE",
            table: "user_emails",
            set: { is_primary: false },
            where: [{ column: "account_id", value: accountId }],
        });

        await this.db.executeCommand({
            option: "INSERT",
            table: "user_emails",
            values: {
                account_id: accountId,
                email,
                is_primary: true,
                verified: true,
            },
            conflict: {
                action: "update",
                target: ["account_id", "email"],
                update: {
                    is_primary: true,
                    verified: true,
                },
            },
        });
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
