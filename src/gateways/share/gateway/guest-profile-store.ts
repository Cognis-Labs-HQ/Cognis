import { randomInt, randomUUID } from "node:crypto";
import type { DbExecutor } from "../../db/reuse/db-executor.js";

export interface GuestProfileRecord {
    guestId: string;
    shareId: string;
    displayName: string;
    avatarKey: string | null;
    createdAt: string;
    expiresAt: string;
}

function isExpired(expiresAt: string): boolean {
    return Boolean(expiresAt) && new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Generates a distinguishing default guest display name (e.g. "Guest
 * #123456") so concurrent guests viewing the same share link are shown as
 * distinct participants instead of all appearing as an identical "Guest".
 */
function generateDefaultGuestDisplayName(): string {
    return `Guest #${randomInt(100000, 1000000)}`;
}

function parseRecord(row: Record<string, unknown>): GuestProfileRecord | null {
    const guestId = String(row.guest_id ?? "").trim();
    const shareId = String(row.share_id ?? "").trim();
    const displayName = String(row.display_name ?? "").trim();
    const createdAt = String(row.created_at ?? "").trim();
    const expiresAt = String(row.expires_at ?? "").trim();
    if (!guestId || !shareId || !displayName || !createdAt || !expiresAt) {
        return null;
    }
    const avatarKey = String(row.avatar_key ?? "").trim();
    return {
        guestId,
        shareId,
        displayName,
        avatarKey: avatarKey ? avatarKey : null,
        createdAt,
        expiresAt,
    };
}

/**
 * Persists temporary guest profiles, one per share-viewing browser session.
 * A guest profile is created alongside the guest access token minted by
 * `resolve-share-token`'s `issue-guest-token` stage, and is the sole source
 * of display identity for share guests (Jitsi Meet user info, chat message
 * sender display name). Guest profiles are never linked to real accounts and
 * are purged once expired, mirroring `ShareTokenStore`'s lazy-purge pattern.
 */
export class GuestProfileStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "share_guest_profiles",
            columns: [
                { name: "guest_id", type: "text", primaryKey: true },
                { name: "share_id", type: "text", notNull: true },
                { name: "display_name", type: "text", notNull: true },
                { name: "avatar_key", type: "text" },
                { name: "created_at", type: "text", notNull: true },
                { name: "expires_at", type: "text", notNull: true },
            ],
        });
    }

    async create(input: {
        shareId: string;
        displayName?: string;
        ttlSeconds: number;
    }): Promise<GuestProfileRecord> {
        const guestId = randomUUID();
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(
            Date.now() + Math.max(1, input.ttlSeconds) * 1000,
        ).toISOString();
        const record: GuestProfileRecord = {
            guestId,
            shareId: String(input.shareId ?? "").trim(),
            displayName:
                String(input.displayName ?? "").trim() ||
                generateDefaultGuestDisplayName(),
            avatarKey: null,
            createdAt,
            expiresAt,
        };
        await this.db.executeCommand({
            option: "INSERT",
            table: "share_guest_profiles",
            values: {
                guest_id: record.guestId,
                share_id: record.shareId,
                display_name: record.displayName,
                avatar_key: record.avatarKey,
                created_at: record.createdAt,
                expires_at: record.expiresAt,
            },
        });
        return record;
    }

    async getById(guestId: string): Promise<GuestProfileRecord | null> {
        const normalizedGuestId = String(guestId ?? "").trim();
        if (!normalizedGuestId) return null;
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_guest_profiles",
            where: [{ column: "guest_id", value: normalizedGuestId }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return null;
        const record = parseRecord(row);
        if (!record) return null;
        if (isExpired(record.expiresAt)) {
            return null;
        }
        return record;
    }

    async deleteById(guestId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "share_guest_profiles",
            where: [
                { column: "guest_id", value: String(guestId ?? "").trim() },
            ],
        });
    }

    async listExpired(): Promise<GuestProfileRecord[]> {
        const nowIso = new Date().toISOString();
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_guest_profiles",
            where: [
                { column: "expires_at", operator: "!=", value: "" as const },
                { column: "expires_at", operator: "<", value: nowIso },
            ],
        });
        const expired = (result.rows ?? [])
            .map(parseRecord)
            .filter((record): record is GuestProfileRecord => Boolean(record));
        return expired;
    }

    async purgeExpired(): Promise<GuestProfileRecord[]> {
        const expired = await this.listExpired();
        const nowIso = new Date().toISOString();
        await this.db.executeCommand({
            option: "DELETE",
            table: "share_guest_profiles",
            where: [
                { column: "expires_at", operator: "!=", value: "" as const },
                { column: "expires_at", operator: "<", value: nowIso },
            ],
        });
        return expired;
    }
}
