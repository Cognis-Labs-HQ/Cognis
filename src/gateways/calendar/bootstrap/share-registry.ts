import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../db/reuse/db-executor.js";

export type CalendarUserShareRegistryRecord = {
    id: string;
    ownerAccountId: string;
    ownerCalendarId: string;
    recipientAccountId: string;
    recipientCalendarId: string;
    recipientHandle: string | null;
    recipientDisplayName: string | null;
    recipientAvatarKey: string | null;
    permission: "read" | "write";
    createdAt: string;
    updatedAt: string;
};

export class CalendarShareRegistry {
    private readonly memoryShareLinks = new Map<
        string,
        { ownerAccountId: string; token: string | null }
    >();
    private readonly memoryUserShares = new Map<
        string,
        CalendarUserShareRegistryRecord
    >();

    constructor(private readonly db: DbExecutor | null) {}

    async ensureSchema(): Promise<void> {
        if (!this.db) return;
        await this.db.ensureTable({
            name: "calendar_share_links",
            columns: [
                { name: "calendar_id", type: "text", notNull: true },
                { name: "owner_account_id", type: "text", notNull: true },
                { name: "token", type: "text" },
                { name: "created_at", type: "text", notNull: true },
                { name: "updated_at", type: "text", notNull: true },
            ],
            primaryKey: ["calendar_id"],
        });
        await this.db.ensureTable({
            name: "calendar_user_shares",
            columns: [
                { name: "id", type: "text", notNull: true, primaryKey: true },
                { name: "owner_account_id", type: "text", notNull: true },
                { name: "owner_calendar_id", type: "text", notNull: true },
                { name: "recipient_account_id", type: "text", notNull: true },
                { name: "recipient_calendar_id", type: "text", notNull: true },
                { name: "recipient_handle", type: "text" },
                { name: "recipient_display_name", type: "text" },
                { name: "recipient_avatar_key", type: "text" },
                { name: "permission", type: "text", notNull: true },
                { name: "created_at", type: "text", notNull: true },
                { name: "updated_at", type: "text", notNull: true },
            ],
        });
    }

    async getShareLink(
        ownerAccountId: string,
        calendarId: string,
    ): Promise<{ token: string | null } | null> {
        if (!this.db) {
            const memoryLink = this.memoryShareLinks.get(calendarId);
            if (!memoryLink || memoryLink.ownerAccountId !== ownerAccountId) {
                return null;
            }
            return { token: memoryLink.token };
        }
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "calendar_share_links",
            columns: ["token"],
            where: [
                { column: "owner_account_id", value: ownerAccountId },
                { column: "calendar_id", value: calendarId },
            ],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return null;
        return { token: row.token == null ? null : String(row.token) };
    }

    async saveShareLink(input: {
        ownerAccountId: string;
        calendarId: string;
        token: string | null;
    }): Promise<void> {
        if (!this.db) {
            this.memoryShareLinks.set(input.calendarId, {
                ownerAccountId: input.ownerAccountId,
                token: input.token,
            });
            return;
        }
        const now = new Date().toISOString();
        await this.db.executeCommand({
            option: "INSERT",
            table: "calendar_share_links",
            values: {
                calendar_id: input.calendarId,
                owner_account_id: input.ownerAccountId,
                token: input.token,
                created_at: now,
                updated_at: now,
            },
            conflict: {
                action: "update",
                target: ["calendar_id"],
                update: {
                    owner_account_id: input.ownerAccountId,
                    token: input.token,
                    updated_at: now,
                },
            },
        });
    }

    async listCalendarUserShares(
        ownerAccountId: string,
        ownerCalendarId: string,
    ): Promise<CalendarUserShareRegistryRecord[]> {
        if (!this.db) {
            return Array.from(this.memoryUserShares.values()).filter(
                (share) =>
                    share.ownerAccountId === ownerAccountId &&
                    share.ownerCalendarId === ownerCalendarId,
            );
        }
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "calendar_user_shares",
            columns: [
                "id",
                "owner_account_id",
                "owner_calendar_id",
                "recipient_account_id",
                "recipient_calendar_id",
                "recipient_handle",
                "recipient_display_name",
                "recipient_avatar_key",
                "permission",
                "created_at",
                "updated_at",
            ],
            where: [
                { column: "owner_account_id", value: ownerAccountId },
                { column: "owner_calendar_id", value: ownerCalendarId },
            ],
        });
        return (result.rows ?? []).map((row) => ({
            id: String(row.id ?? ""),
            ownerAccountId: String(row.owner_account_id ?? ""),
            ownerCalendarId: String(row.owner_calendar_id ?? ""),
            recipientAccountId: String(row.recipient_account_id ?? ""),
            recipientCalendarId: String(row.recipient_calendar_id ?? ""),
            recipientHandle:
                row.recipient_handle == null
                    ? null
                    : String(row.recipient_handle),
            recipientDisplayName:
                row.recipient_display_name == null
                    ? null
                    : String(row.recipient_display_name),
            recipientAvatarKey:
                row.recipient_avatar_key == null
                    ? null
                    : String(row.recipient_avatar_key),
            permission: row.permission === "write" ? "write" : "read",
            createdAt: String(row.created_at ?? ""),
            updatedAt: String(row.updated_at ?? ""),
        }));
    }

    async upsertCalendarUserShare(input: {
        ownerAccountId: string;
        ownerCalendarId: string;
        recipientAccountId: string;
        recipientCalendarId: string;
        recipientHandle?: string | null;
        recipientDisplayName?: string | null;
        recipientAvatarKey?: string | null;
        permission: "read" | "write";
    }): Promise<CalendarUserShareRegistryRecord> {
        const now = new Date().toISOString();
        const existing = (
            await this.listCalendarUserShares(
                input.ownerAccountId,
                input.ownerCalendarId,
            )
        ).find(
            (share) => share.recipientAccountId === input.recipientAccountId,
        );
        const share: CalendarUserShareRegistryRecord = {
            id: existing?.id ?? randomUUID(),
            ownerAccountId: input.ownerAccountId,
            ownerCalendarId: input.ownerCalendarId,
            recipientAccountId: input.recipientAccountId,
            recipientCalendarId:
                existing?.recipientCalendarId ?? input.recipientCalendarId,
            recipientHandle: input.recipientHandle ?? null,
            recipientDisplayName: input.recipientDisplayName ?? null,
            recipientAvatarKey: input.recipientAvatarKey ?? null,
            permission: input.permission,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
        };
        if (!this.db) {
            this.memoryUserShares.set(share.id, share);
            return share;
        }
        await this.db.executeCommand({
            option: "INSERT",
            table: "calendar_user_shares",
            values: {
                id: share.id,
                owner_account_id: share.ownerAccountId,
                owner_calendar_id: share.ownerCalendarId,
                recipient_account_id: share.recipientAccountId,
                recipient_calendar_id: share.recipientCalendarId,
                recipient_handle: share.recipientHandle,
                recipient_display_name: share.recipientDisplayName,
                recipient_avatar_key: share.recipientAvatarKey,
                permission: share.permission,
                created_at: share.createdAt,
                updated_at: share.updatedAt,
            },
            conflict: {
                action: "update",
                target: ["id"],
                update: {
                    recipient_handle: share.recipientHandle,
                    recipient_display_name: share.recipientDisplayName,
                    recipient_avatar_key: share.recipientAvatarKey,
                    permission: share.permission,
                    updated_at: share.updatedAt,
                },
            },
        });
        return share;
    }

    async getByRecipientCalendarId(
        recipientCalendarId: string,
    ): Promise<CalendarUserShareRegistryRecord | null> {
        if (!this.db) {
            return (
                Array.from(this.memoryUserShares.values()).find(
                    (share) =>
                        share.recipientCalendarId === recipientCalendarId,
                ) ?? null
            );
        }
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "calendar_user_shares",
            columns: [
                "id",
                "owner_account_id",
                "owner_calendar_id",
                "recipient_account_id",
                "recipient_calendar_id",
                "recipient_handle",
                "recipient_display_name",
                "recipient_avatar_key",
                "permission",
                "created_at",
                "updated_at",
            ],
            where: [
                { column: "recipient_calendar_id", value: recipientCalendarId },
            ],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return null;
        return {
            id: String(row.id ?? ""),
            ownerAccountId: String(row.owner_account_id ?? ""),
            ownerCalendarId: String(row.owner_calendar_id ?? ""),
            recipientAccountId: String(row.recipient_account_id ?? ""),
            recipientCalendarId: String(row.recipient_calendar_id ?? ""),
            recipientHandle:
                row.recipient_handle == null
                    ? null
                    : String(row.recipient_handle),
            recipientDisplayName:
                row.recipient_display_name == null
                    ? null
                    : String(row.recipient_display_name),
            recipientAvatarKey:
                row.recipient_avatar_key == null
                    ? null
                    : String(row.recipient_avatar_key),
            permission: row.permission === "write" ? "write" : "read",
            createdAt: String(row.created_at ?? ""),
            updatedAt: String(row.updated_at ?? ""),
        };
    }
}
