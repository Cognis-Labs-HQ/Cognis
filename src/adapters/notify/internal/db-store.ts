/**
 * Database-backed encrypted notification store for the internal adapter.
 *
 * Notifications are persisted in a dedicated `internal_notifications` table.
 * The subject, body, category, senderName, and actionUrl fields are encrypted
 * with a per-user AES-256-GCM key (see ../../../api/reuse/crypto.ts). Only the
 * account ID, read flag, and creation timestamp are stored in plaintext.
 *
 * Eviction mirrors the in-memory store: at most MAX_PER_USER rows per user are
 * kept; the oldest are deleted when the cap is exceeded.
 *
 * @module adapters/notify/internal/db-store
 */
import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbTableDef } from "../../../gateways/db/reuse/db-table.js";
import type { NotificationEnvelope } from "../../../gateways/notify/gateway.js";
import type {
    InternalNotification,
    IInternalNotificationStore,
} from "./store.js";
import {
    deriveScopedKey,
    encryptPayload,
    decryptPayload,
} from "../../../api/reuse/crypto.js";

interface EncryptedPayload {
    subject: string;
    body: string;
    category: string;
    senderName?: string;
    actionUrl?: string;
}

const MAX_PER_USER = 50;

type StoreLog = (
    level: string,
    msg: string,
    meta?: Record<string, unknown>,
) => void;

export class DbInternalNotificationStore implements IInternalNotificationStore {
    constructor(
        private readonly db: DbExecutor,
        private readonly serverSecret: string,
        private readonly log?: StoreLog,
    ) {}

    async ensureSchema(): Promise<void> {
        const definition = {
            name: "internal_notifications",
            columns: [
                { name: "id", type: "text", notNull: true, primaryKey: true },
                { name: "account_id", type: "text", notNull: true },
                { name: "iv", type: "text", notNull: true },
                { name: "payload_enc", type: "text", notNull: true },
                {
                    name: "is_read",
                    type: "integer",
                    notNull: true,
                    default: 0,
                    renamedFrom: "read",
                },
                { name: "created_at", type: "bigint", notNull: true },
            ],
            indexes: [
                {
                    columns: ["account_id", "created_at"],
                    name: "idx_internal_notif_account",
                },
            ],
        } satisfies StructuredDbTableDef & {
            columns: Array<
                StructuredDbTableDef["columns"][number] & {
                    renamedFrom?: string;
                }
            >;
        };
        await this.db.ensureTable(definition);
    }

    async add(envelope: NotificationEnvelope): Promise<void> {
        const key = await deriveScopedKey(
            `user:notifications:${envelope.recipientUsername}`,
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

        await this.db.executeCommand({
            option: "INSERT",
            table: "internal_notifications",
            values: {
                id,
                account_id: envelope.recipientUsername,
                iv,
                payload_enc: ciphertext,
                is_read: 0,
                created_at: now,
            },
        });

        await this.evictOldest(envelope.recipientUsername);
    }

    private async evictOldest(accountId: string): Promise<void> {
        const countResult = await this.db.executeCommand({
            option: "SELECT",
            table: "internal_notifications",
            count: true,
            where: [{ column: "account_id", value: accountId }],
        });
        const total = Number(
            (countResult.rows?.[0] as Record<string, unknown>)?.cnt ?? 0,
        );
        if (total <= MAX_PER_USER) return;

        const excess = total - MAX_PER_USER;
        const idsResult = await this.db.executeCommand({
            option: "SELECT",
            table: "internal_notifications",
            columns: ["id"],
            where: [{ column: "account_id", value: accountId }],
            orderBy: [{ column: "created_at", direction: "ASC" }],
            limit: excess,
        });
        const ids = (idsResult.rows ?? []).map(
            (row) => (row as Record<string, unknown>).id as string,
        );
        for (const id of ids) {
            await this.db.executeCommand({
                option: "DELETE",
                table: "internal_notifications",
                where: [{ column: "id", value: id }],
            });
        }
    }

    async list(username: string): Promise<InternalNotification[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "internal_notifications",
            columns: ["id", "iv", "payload_enc", "is_read", "created_at"],
            where: [{ column: "account_id", value: username }],
            orderBy: [{ column: "created_at", direction: "DESC" }],
        });
        if (!result.rows?.length) return [];

        const key = await deriveScopedKey(
            `user:notifications:${username}`,
            this.serverSecret,
        );
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
                    read: Boolean(row.is_read),
                    createdAt: Number(row.created_at),
                });
            } catch (err) {
                this.log?.(
                    "warn",
                    "Failed to decrypt notification; row skipped. Verify DATA_ENCRYPTION_KEY matches the value used when this notification was encrypted (the key cannot be rotated without re-encrypting existing rows). If the key is unchanged, check the database row for corruption.",
                    {
                        component: "notify-internal",
                        notifId: row.id,
                        error: err instanceof Error ? err.message : String(err),
                    },
                );
            }
        }

        return notifications;
    }

    async countUnread(username: string): Promise<number> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "internal_notifications",
            count: true,
            where: [
                { column: "account_id", value: username },
                { column: "is_read", value: 0 },
            ],
        });
        return Number((result.rows?.[0] as Record<string, unknown>)?.cnt ?? 0);
    }

    async markRead(username: string, id: string): Promise<boolean> {
        const check = await this.db.executeCommand({
            option: "SELECT",
            table: "internal_notifications",
            columns: ["id"],
            where: [
                { column: "id", value: id },
                { column: "account_id", value: username },
            ],
        });
        if (!check.rows?.length) return false;

        await this.db.executeCommand({
            option: "UPDATE",
            table: "internal_notifications",
            set: { is_read: 1 },
            where: [
                { column: "id", value: id },
                { column: "account_id", value: username },
            ],
        });
        return true;
    }

    async markAllRead(username: string): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "internal_notifications",
            set: { is_read: 1 },
            where: [{ column: "account_id", value: username }],
        });
    }

    async delete(username: string, id: string): Promise<boolean> {
        const check = await this.db.executeCommand({
            option: "SELECT",
            table: "internal_notifications",
            columns: ["id"],
            where: [
                { column: "id", value: id },
                { column: "account_id", value: username },
            ],
        });
        if (!check.rows?.length) return false;

        await this.db.executeCommand({
            option: "DELETE",
            table: "internal_notifications",
            where: [
                { column: "id", value: id },
                { column: "account_id", value: username },
            ],
        });
        return true;
    }

    async deleteAll(username: string): Promise<number> {
        const countResult = await this.db.executeCommand({
            option: "SELECT",
            table: "internal_notifications",
            count: true,
            where: [{ column: "account_id", value: username }],
        });
        const total = Number(
            (countResult.rows?.[0] as Record<string, unknown>)?.cnt ?? 0,
        );
        if (total === 0) return 0;

        await this.db.executeCommand({
            option: "DELETE",
            table: "internal_notifications",
            where: [{ column: "account_id", value: username }],
        });
        return total;
    }
}
