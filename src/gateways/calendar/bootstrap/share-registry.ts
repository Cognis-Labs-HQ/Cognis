import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../db/reuse/db-executor.js";

export type CalendarShareLinkRegistryRecord = {
    id: string;
    ownerAccountId: string;
    calendarId: string;
    token: string;
    name: string | null;
    passphrase: string | null;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
};

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

type StoredCalendarShareLinks = {
    version: 2;
    links: CalendarShareLinkRegistryRecord[];
};

export class CalendarShareRegistry {
    private readonly memoryShareLinks = new Map<
        string,
        {
            ownerAccountId: string;
            links: CalendarShareLinkRegistryRecord[];
        }
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

    async listShareLinks(
        ownerAccountId: string,
        calendarId: string,
    ): Promise<CalendarShareLinkRegistryRecord[]> {
        const existingLinks = await this.readShareLinks(ownerAccountId, calendarId);
        const activeLinks = this.pruneExpiredShareLinks(existingLinks);
        if (activeLinks.length !== existingLinks.length) {
            await this.writeShareLinks({
                ownerAccountId,
                calendarId,
                links: activeLinks,
            });
        }
        return [...activeLinks].sort((left, right) =>
            right.createdAt.localeCompare(left.createdAt),
        );
    }

    async createShareLink(input: {
        ownerAccountId: string;
        calendarId: string;
        name?: string | null;
        passphrase?: string | null;
        expiresAt: string;
    }): Promise<CalendarShareLinkRegistryRecord> {
        const now = new Date().toISOString();
        const shareLink: CalendarShareLinkRegistryRecord = {
            id: randomUUID(),
            ownerAccountId: input.ownerAccountId,
            calendarId: input.calendarId,
            token: randomUUID(),
            name: this.normalizeOptionalString(input.name),
            passphrase: this.normalizeOptionalString(input.passphrase),
            createdAt: now,
            updatedAt: now,
            expiresAt: input.expiresAt,
        };
        const links = await this.listShareLinks(
            input.ownerAccountId,
            input.calendarId,
        );
        links.unshift(shareLink);
        await this.writeShareLinks({
            ownerAccountId: input.ownerAccountId,
            calendarId: input.calendarId,
            links,
        });
        return shareLink;
    }

    async resolveShareLink(
        token: string,
    ): Promise<CalendarShareLinkRegistryRecord | null> {
        const normalizedToken = String(token ?? "").trim();
        if (!normalizedToken) return null;
        if (!this.db) {
            for (const [calendarId, memoryEntry] of this.memoryShareLinks.entries()) {
                const activeLinks = this.pruneExpiredShareLinks(memoryEntry.links);
                if (activeLinks.length !== memoryEntry.links.length) {
                    this.memoryShareLinks.set(calendarId, {
                        ownerAccountId: memoryEntry.ownerAccountId,
                        links: activeLinks,
                    });
                }
                const resolvedLink =
                    activeLinks.find((entry) => entry.token === normalizedToken) ??
                    null;
                if (resolvedLink) return resolvedLink;
            }
            return null;
        }
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "calendar_share_links",
            columns: [
                "calendar_id",
                "owner_account_id",
                "token",
                "created_at",
                "updated_at",
            ],
        });
        for (const row of result.rows ?? []) {
            const ownerAccountId = String(row.owner_account_id ?? "").trim();
            const calendarId = String(row.calendar_id ?? "").trim();
            if (!ownerAccountId || !calendarId) continue;
            const existingLinks = this.parseShareLinksFromRow({
                ownerAccountId,
                calendarId,
                storedValue: row.token,
                createdAt: String(row.created_at ?? ""),
                updatedAt: String(row.updated_at ?? ""),
            });
            const activeLinks = this.pruneExpiredShareLinks(existingLinks);
            if (activeLinks.length !== existingLinks.length) {
                await this.writeShareLinks({
                    ownerAccountId,
                    calendarId,
                    links: activeLinks,
                });
            }
            const resolvedLink =
                activeLinks.find((entry) => entry.token === normalizedToken) ?? null;
            if (resolvedLink) return resolvedLink;
        }
        return null;
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

    private normalizeOptionalString(value: unknown): string | null {
        const normalizedValue = String(value ?? "").trim();
        return normalizedValue ? normalizedValue : null;
    }

    private isExpiredShareLink(shareLink: CalendarShareLinkRegistryRecord): boolean {
        if (!shareLink.expiresAt) return false;
        const expiresAtMs = Date.parse(shareLink.expiresAt);
        return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
    }

    private pruneExpiredShareLinks(
        shareLinks: CalendarShareLinkRegistryRecord[],
    ): CalendarShareLinkRegistryRecord[] {
        return shareLinks.filter((shareLink) => !this.isExpiredShareLink(shareLink));
    }

    private serializeShareLinks(
        shareLinks: CalendarShareLinkRegistryRecord[],
    ): string {
        const payload: StoredCalendarShareLinks = {
            version: 2,
            links: shareLinks.map((shareLink) => ({
                ...shareLink,
                name: this.normalizeOptionalString(shareLink.name),
                passphrase: this.normalizeOptionalString(shareLink.passphrase),
                expiresAt: String(shareLink.expiresAt ?? "").trim(),
            })),
        };
        return JSON.stringify(payload);
    }

    private parseShareLinksFromRow(input: {
        ownerAccountId: string;
        calendarId: string;
        storedValue: unknown;
        createdAt: string;
        updatedAt: string;
    }): CalendarShareLinkRegistryRecord[] {
        const normalizedCreatedAt =
            input.createdAt || input.updatedAt || new Date().toISOString();
        const normalizedUpdatedAt =
            input.updatedAt || input.createdAt || normalizedCreatedAt;
        const storedValue =
            typeof input.storedValue === "string" ? input.storedValue.trim() : "";
        if (!storedValue) return [];
        try {
            const parsed = JSON.parse(storedValue) as
                | StoredCalendarShareLinks
                | CalendarShareLinkRegistryRecord[];
            const links = Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.links)
                  ? parsed.links
                  : [];
            return links
                .map((shareLink) =>
                    this.normalizeShareLinkRecord(
                        shareLink,
                        input.ownerAccountId,
                        input.calendarId,
                        normalizedCreatedAt,
                        normalizedUpdatedAt,
                    ),
                )
                .filter(Boolean) as CalendarShareLinkRegistryRecord[];
        } catch {
            return [
                {
                    id: randomUUID(),
                    ownerAccountId: input.ownerAccountId,
                    calendarId: input.calendarId,
                    token: storedValue,
                    name: null,
                    passphrase: null,
                    createdAt: normalizedCreatedAt,
                    updatedAt: normalizedUpdatedAt,
                    expiresAt: "",
                },
            ];
        }
    }

    private normalizeShareLinkRecord(
        shareLink: unknown,
        ownerAccountId: string,
        calendarId: string,
        fallbackCreatedAt: string,
        fallbackUpdatedAt: string,
    ): CalendarShareLinkRegistryRecord | null {
        if (!shareLink || typeof shareLink !== "object") return null;
        const record = shareLink as Partial<CalendarShareLinkRegistryRecord>;
        const token = String(record.token ?? "").trim();
        if (!token) return null;
        return {
            id: String(record.id ?? randomUUID()).trim() || randomUUID(),
            ownerAccountId,
            calendarId,
            token,
            name: this.normalizeOptionalString(record.name),
            passphrase: this.normalizeOptionalString(record.passphrase),
            createdAt:
                String(record.createdAt ?? "").trim() || fallbackCreatedAt,
            updatedAt:
                String(record.updatedAt ?? "").trim() || fallbackUpdatedAt,
            expiresAt: String(record.expiresAt ?? "").trim(),
        };
    }

    private async readShareLinks(
        ownerAccountId: string,
        calendarId: string,
    ): Promise<CalendarShareLinkRegistryRecord[]> {
        if (!this.db) {
            const memoryEntry = this.memoryShareLinks.get(calendarId);
            if (!memoryEntry || memoryEntry.ownerAccountId !== ownerAccountId) {
                return [];
            }
            return [...memoryEntry.links];
        }
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "calendar_share_links",
            columns: ["token", "created_at", "updated_at"],
            where: [
                { column: "owner_account_id", value: ownerAccountId },
                { column: "calendar_id", value: calendarId },
            ],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return [];
        return this.parseShareLinksFromRow({
            ownerAccountId,
            calendarId,
            storedValue: row.token,
            createdAt: String(row.created_at ?? ""),
            updatedAt: String(row.updated_at ?? ""),
        });
    }

    private async writeShareLinks(input: {
        ownerAccountId: string;
        calendarId: string;
        links: CalendarShareLinkRegistryRecord[];
    }): Promise<void> {
        if (!this.db) {
            this.memoryShareLinks.set(input.calendarId, {
                ownerAccountId: input.ownerAccountId,
                links: [...input.links],
            });
            return;
        }
        const now = new Date().toISOString();
        const existingLinks = await this.readShareLinks(
            input.ownerAccountId,
            input.calendarId,
        );
        const createdAt = existingLinks[0]?.createdAt ?? now;
        await this.db.executeCommand({
            option: "INSERT",
            table: "calendar_share_links",
            values: {
                calendar_id: input.calendarId,
                owner_account_id: input.ownerAccountId,
                token: this.serializeShareLinks(input.links),
                created_at: createdAt,
                updated_at: now,
            },
            conflict: {
                action: "update",
                target: ["calendar_id"],
                update: {
                    owner_account_id: input.ownerAccountId,
                    token: this.serializeShareLinks(input.links),
                    updated_at: now,
                },
            },
        });
    }
}
