/**
 * Database-backed encrypted notification store for the internal adapter.
 *
 * Notifications are persisted in a dedicated `internal_notifications` table.
 * The subject, body, category, senderName, and actionUrl fields are encrypted
 * with a per-user AES-256-GCM key (see reuse/crypto-keys.ts). Only the account
 * ID, read flag, and creation timestamp are stored in plaintext.
 *
 * Eviction mirrors the in-memory store: at most MAX_PER_USER rows per user are
 * kept; the oldest are deleted when the cap is exceeded.
 *
 * @module notify-internal/reuse/db-store
 */
import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { SupportedDbType } from "../../../../gateways/db/executor.js";
import type { NotificationEnvelope } from "../../../../gateways/notify/gateway.js";
import type {
    InternalNotification,
    IInternalNotificationStore,
} from "../store.js";
import {
    deriveUserKey,
    encryptPayload,
    decryptPayload,
} from "./crypto-keys.js";

interface EncryptedPayload {
    subject: string;
    body: string;
    category: string;
    senderName?: string;
    actionUrl?: string;
}

const MAX_PER_USER = 50;

export class DbInternalNotificationStore implements IInternalNotificationStore {
    constructor(
        private readonly db: DbExecutor,
        private readonly dbType: SupportedDbType,
        private readonly serverSecret: string,
    ) {}

    private placeholder(index: number): string {
        return this.dbType === "postgresql" ? `$${index}` : "?";
    }

    private boolRead(): string {
        return this.dbType === "mariadb" ? "TINYINT(1)" : "INTEGER";
    }

    async ensureSchema(): Promise<void> {
        await this.db.execute(`
            CREATE TABLE IF NOT EXISTS internal_notifications (
                id VARCHAR(36) NOT NULL,
                account_id VARCHAR(191) NOT NULL,
                iv VARCHAR(32) NOT NULL,
                payload_enc TEXT NOT NULL,
                read ${this.boolRead()} NOT NULL DEFAULT 0,
                created_at BIGINT NOT NULL,
                PRIMARY KEY (id)
            )
        `);
        try {
            await this.db.execute(
                "CREATE INDEX IF NOT EXISTS idx_internal_notif_account" +
                    " ON internal_notifications (account_id, created_at)",
            );
        } catch {
            // Index may already exist in older MariaDB versions that do not support IF NOT EXISTS
        }
    }

    async add(envelope: NotificationEnvelope): Promise<void> {
        const key = await deriveUserKey(
            envelope.recipientUsername,
            this.serverSecret,
        );
        const payload: EncryptedPayload = {
            subject: envelope.subject,
            body: envelope.body,
            category: envelope.category,
            senderName: envelope.senderName,
            actionUrl: envelope.actionUrl,
        };
        const { iv, ciphertext } = await encryptPayload(
            key,
            JSON.stringify(payload),
        );
        const id = randomUUID();
        const now = Date.now();

        await this.db.execute(
            `INSERT INTO internal_notifications (id, account_id, iv, payload_enc, read, created_at)
             VALUES (${this.placeholder(1)}, ${this.placeholder(2)}, ${this.placeholder(3)}, ${this.placeholder(4)}, 0, ${this.placeholder(5)})`,
            [id, envelope.recipientUsername, iv, ciphertext, now],
        );

        await this.evictOldest(envelope.recipientUsername);
    }

    private async evictOldest(accountId: string): Promise<void> {
        const countResult = await this.db.execute(
            `SELECT COUNT(*) as cnt FROM internal_notifications WHERE account_id = ${this.placeholder(1)}`,
            [accountId],
        );
        const total = Number(
            (countResult.rows?.[0] as Record<string, unknown>)?.cnt ?? 0,
        );
        if (total <= MAX_PER_USER) return;

        const excess = total - MAX_PER_USER;
        const idsResult = await this.db.execute(
            `SELECT id FROM internal_notifications
             WHERE account_id = ${this.placeholder(1)}
             ORDER BY created_at ASC
             LIMIT ${excess}`,
            [accountId],
        );
        const ids = (idsResult.rows ?? []).map(
            (r) => (r as Record<string, unknown>).id as string,
        );
        for (const id of ids) {
            await this.db.execute(
                `DELETE FROM internal_notifications WHERE id = ${this.placeholder(1)}`,
                [id],
            );
        }
    }

    async list(username: string): Promise<InternalNotification[]> {
        const result = await this.db.execute(
            `SELECT id, iv, payload_enc, read, created_at
             FROM internal_notifications
             WHERE account_id = ${this.placeholder(1)}
             ORDER BY created_at DESC`,
            [username],
        );
        if (!result.rows?.length) return [];

        const key = await deriveUserKey(username, this.serverSecret);
        const notifications: InternalNotification[] = [];

        for (const rawRow of result.rows) {
            const row = rawRow as Record<string, unknown>;
            try {
                const plaintext = await decryptPayload(
                    key,
                    row.iv as string,
                    row.payload_enc as string,
                );
                const payload = JSON.parse(plaintext) as EncryptedPayload;
                notifications.push({
                    id: row.id as string,
                    recipientUsername: username,
                    subject: payload.subject,
                    body: payload.body,
                    category: payload.category,
                    senderName: payload.senderName,
                    actionUrl: payload.actionUrl,
                    read: Boolean(row.read),
                    createdAt: Number(row.created_at),
                });
            } catch {
                // Decryption failed — skip row (key rotation, corruption, or wrong secret)
            }
        }

        return notifications;
    }

    async countUnread(username: string): Promise<number> {
        const result = await this.db.execute(
            `SELECT COUNT(*) as cnt FROM internal_notifications
             WHERE account_id = ${this.placeholder(1)} AND read = 0`,
            [username],
        );
        return Number((result.rows?.[0] as Record<string, unknown>)?.cnt ?? 0);
    }

    async markRead(username: string, id: string): Promise<boolean> {
        const check = await this.db.execute(
            `SELECT id FROM internal_notifications
             WHERE id = ${this.placeholder(1)} AND account_id = ${this.placeholder(2)}`,
            [id, username],
        );
        if (!check.rows?.length) return false;

        await this.db.execute(
            `UPDATE internal_notifications SET read = 1
             WHERE id = ${this.placeholder(1)} AND account_id = ${this.placeholder(2)}`,
            [id, username],
        );
        return true;
    }

    async markAllRead(username: string): Promise<void> {
        await this.db.execute(
            `UPDATE internal_notifications SET read = 1
             WHERE account_id = ${this.placeholder(1)}`,
            [username],
        );
    }

    async delete(username: string, id: string): Promise<boolean> {
        const check = await this.db.execute(
            `SELECT id FROM internal_notifications
             WHERE id = ${this.placeholder(1)} AND account_id = ${this.placeholder(2)}`,
            [id, username],
        );
        if (!check.rows?.length) return false;

        await this.db.execute(
            `DELETE FROM internal_notifications
             WHERE id = ${this.placeholder(1)} AND account_id = ${this.placeholder(2)}`,
            [id, username],
        );
        return true;
    }
}
