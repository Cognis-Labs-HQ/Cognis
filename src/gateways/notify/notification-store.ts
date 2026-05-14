import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { NotificationPreferenceStore } from "./gateway.js";

export interface NotificationConfigStore {
    getConfig(senderId: string): Promise<Record<string, unknown> | null>;
    saveConfig(
        senderId: string,
        config: Record<string, unknown>,
    ): Promise<void>;
}

export type NotificationBroadcastDisplayMode = "bar" | "popup";
export type NotificationBroadcastRole =
    | "user"
    | "teacher"
    | "moderator"
    | "admin"
    | "owner";

export interface NotificationBroadcast {
    id: string;
    title: string;
    message: string;
    displayMode: NotificationBroadcastDisplayMode;
    targetRoles: NotificationBroadcastRole[];
    startAt: number | null;
    endAt: number | null;
    requireAcknowledgement: boolean;
    redirectUrl: string | null;
    enabled: boolean;
    createdBy: string;
    createdAt: number;
    updatedAt: number;
}

export interface NotificationBroadcastInput {
    title: string;
    message: string;
    displayMode: NotificationBroadcastDisplayMode;
    targetRoles: NotificationBroadcastRole[];
    startAt: number | null;
    endAt: number | null;
    requireAcknowledgement: boolean;
    redirectUrl: string | null;
    enabled: boolean;
    createdBy: string;
}

export class DbNotificationStore implements NotificationConfigStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "notification_provider_configs",
            columns: [
                {
                    name: "sender_id",
                    type: "text",
                    notNull: true,
                    primaryKey: true,
                },
                { name: "config_json", type: "text", notNull: true },
            ],
        });
        await this.db.ensureTable({
            name: "notification_broadcasts",
            columns: [
                {
                    name: "id",
                    type: "text",
                    notNull: true,
                    primaryKey: true,
                },
                { name: "title", type: "text", notNull: true },
                { name: "message", type: "text", notNull: true },
                { name: "display_mode", type: "text", notNull: true },
                { name: "target_roles_json", type: "text", notNull: true },
                { name: "start_at", type: "bigint" },
                { name: "end_at", type: "bigint" },
                {
                    name: "require_acknowledgement",
                    type: "boolean",
                    notNull: true,
                    default: "false",
                },
                { name: "redirect_url", type: "text" },
                {
                    name: "enabled",
                    type: "boolean",
                    notNull: true,
                    default: "true",
                },
                { name: "created_by", type: "text", notNull: true },
                { name: "created_at", type: "bigint", notNull: true },
                { name: "updated_at", type: "bigint", notNull: true },
            ],
            indexes: [
                {
                    name: "idx_notification_broadcasts_enabled",
                    columns: ["enabled", "created_at"],
                },
            ],
        });
        await this.db.ensureTable({
            name: "user_notification_broadcast_states",
            columns: [
                { name: "account_id", type: "text", notNull: true },
                { name: "broadcast_id", type: "text", notNull: true },
                { name: "dismissed_at", type: "bigint" },
                { name: "acknowledged_at", type: "bigint" },
            ],
            primaryKey: ["account_id", "broadcast_id"],
            indexes: [
                {
                    name: "idx_user_notification_broadcast_states_account",
                    columns: ["account_id", "broadcast_id"],
                },
            ],
        });
        await this.db.ensureTable({
            name: "user_notification_prefs",
            columns: [
                { name: "account_id", type: "text", notNull: true },
                { name: "category", type: "text", notNull: true },
                { name: "sender_id", type: "text", notNull: true },
            ],
            primaryKey: ["account_id", "category", "sender_id"],
        });
        await this.db.ensureTable({
            name: "user_emails",
            columns: [
                { name: "account_id", type: "text", notNull: true },
                { name: "email", type: "text", notNull: true },
                {
                    name: "is_primary",
                    type: "boolean",
                    notNull: true,
                    default: "false",
                },
                {
                    name: "verified",
                    type: "boolean",
                    notNull: true,
                    default: "false",
                },
            ],
            primaryKey: ["account_id", "email"],
            uniqueKeys: [["email"]],
        });
    }

    private parseBroadcastRow(row: Record<string, unknown>): NotificationBroadcast {
        const parsedRoles = JSON.parse(
            String(row.target_roles_json ?? "[]"),
        ) as NotificationBroadcastRole[];
        const targetRoles = Array.isArray(parsedRoles)
            ? parsedRoles.filter((role) =>
                  ["user", "teacher", "moderator", "admin", "owner"].includes(
                      String(role),
                  ),
              )
            : [];
        return {
            id: String(row.id),
            title: String(row.title ?? ""),
            message: String(row.message ?? ""),
            displayMode:
                row.display_mode === "popup" ? "popup" : "bar",
            targetRoles,
            startAt:
                row.start_at == null ? null : Number(row.start_at),
            endAt: row.end_at == null ? null : Number(row.end_at),
            requireAcknowledgement: Boolean(row.require_acknowledgement),
            redirectUrl:
                row.redirect_url == null ? null : String(row.redirect_url),
            enabled: Boolean(row.enabled),
            createdBy: String(row.created_by ?? ""),
            createdAt: Number(row.created_at ?? 0),
            updatedAt: Number(row.updated_at ?? 0),
        };
    }

    async createBroadcast(
        input: NotificationBroadcastInput,
    ): Promise<NotificationBroadcast> {
        const id = randomUUID();
        const now = Date.now();
        const targetRolesJson = JSON.stringify(input.targetRoles);
        await this.db.executeCommand({
            option: "INSERT",
            table: "notification_broadcasts",
            values: {
                id,
                title: input.title,
                message: input.message,
                display_mode: input.displayMode,
                target_roles_json: targetRolesJson,
                start_at: input.startAt,
                end_at: input.endAt,
                require_acknowledgement: input.requireAcknowledgement,
                redirect_url: input.redirectUrl,
                enabled: input.enabled,
                created_by: input.createdBy,
                created_at: now,
                updated_at: now,
            },
        });
        return {
            id,
            title: input.title,
            message: input.message,
            displayMode: input.displayMode,
            targetRoles: [...input.targetRoles],
            startAt: input.startAt,
            endAt: input.endAt,
            requireAcknowledgement: input.requireAcknowledgement,
            redirectUrl: input.redirectUrl,
            enabled: input.enabled,
            createdBy: input.createdBy,
            createdAt: now,
            updatedAt: now,
        };
    }

    async listBroadcasts(): Promise<NotificationBroadcast[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "notification_broadcasts",
            columns: [
                "id",
                "title",
                "message",
                "display_mode",
                "target_roles_json",
                "start_at",
                "end_at",
                "require_acknowledgement",
                "redirect_url",
                "enabled",
                "created_by",
                "created_at",
                "updated_at",
            ],
            orderBy: [{ column: "created_at", direction: "DESC" }],
        });
        return (result.rows ?? []).map((row) =>
            this.parseBroadcastRow(row as Record<string, unknown>),
        );
    }

    async setBroadcastEnabled(id: string, enabled: boolean): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "notification_broadcasts",
            set: {
                enabled,
                updated_at: Date.now(),
            },
            where: [{ column: "id", value: id }],
        });
    }

    async getActiveBroadcastsForRole(
        accountId: string,
        role: NotificationBroadcastRole,
        now = Date.now(),
    ): Promise<NotificationBroadcast[]> {
        const allBroadcasts = await this.listBroadcasts();
        const visibleBroadcasts = allBroadcasts.filter((broadcast) => {
            if (!broadcast.enabled) return false;
            if (
                broadcast.targetRoles.length > 0 &&
                !broadcast.targetRoles.includes(role)
            ) {
                return false;
            }
            if (broadcast.startAt !== null && now < broadcast.startAt) {
                return false;
            }
            if (broadcast.endAt !== null && now > broadcast.endAt) {
                return false;
            }
            return true;
        });
        if (visibleBroadcasts.length === 0) return [];
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "user_notification_broadcast_states",
            columns: ["broadcast_id", "dismissed_at", "acknowledged_at"],
            where: [{ column: "account_id", value: accountId }],
        });
        const stateByBroadcastId = new Map<
            string,
            { dismissedAt: number | null; acknowledgedAt: number | null }
        >();
        for (const row of result.rows ?? []) {
            const typedRow = row as Record<string, unknown>;
            const stateBroadcastId = String(typedRow.broadcast_id ?? "");
            stateByBroadcastId.set(stateBroadcastId, {
                dismissedAt:
                    typedRow.dismissed_at == null
                        ? null
                        : Number(typedRow.dismissed_at),
                acknowledgedAt:
                    typedRow.acknowledged_at == null
                        ? null
                        : Number(typedRow.acknowledged_at),
            });
        }
        return visibleBroadcasts.filter((broadcast) => {
            const state = stateByBroadcastId.get(broadcast.id);
            if (broadcast.requireAcknowledgement) {
                return !state?.acknowledgedAt;
            }
            return !state?.dismissedAt;
        });
    }

    async markBroadcastDismissed(
        accountId: string,
        broadcastId: string,
    ): Promise<void> {
        const dismissedAt = Date.now();
        await this.db.executeCommand({
            option: "INSERT",
            table: "user_notification_broadcast_states",
            values: {
                account_id: accountId,
                broadcast_id: broadcastId,
                dismissed_at: dismissedAt,
                acknowledged_at: null,
            },
            conflict: {
                action: "update",
                target: ["account_id", "broadcast_id"],
                update: { dismissed_at: dismissedAt },
            },
        });
    }

    async markBroadcastAcknowledged(
        accountId: string,
        broadcastId: string,
    ): Promise<void> {
        const acknowledgedAt = Date.now();
        await this.db.executeCommand({
            option: "INSERT",
            table: "user_notification_broadcast_states",
            values: {
                account_id: accountId,
                broadcast_id: broadcastId,
                dismissed_at: null,
                acknowledged_at: acknowledgedAt,
            },
            conflict: {
                action: "update",
                target: ["account_id", "broadcast_id"],
                update: { acknowledged_at: acknowledgedAt },
            },
        });
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
