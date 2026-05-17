import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbTableDef } from "../../../gateways/db/reuse/db-table.js";
import {
    normalizeHandleKey,
    rowToProfile,
} from "../../../gateways/social/reuse/profile-record.js";
export type {
    AccountRole,
    AccountVisibility,
    PostVisibility,
    AccountProfile,
    Post,
    FileSizeLimit,
    ProfileCreateStore,
    ProfileStore,
} from "./profile-store.js";
export { visibilityRank } from "./profile-store.js";
import type {
    AccountRole,
    AccountVisibility,
    PostVisibility,
    AccountProfile,
    Post,
    FileSizeLimit,
    ProfileCreateStore,
} from "./profile-store.js";

function rowToPost(row: any): Post {
    return {
        id: row.id,
        accountId: row.account_id,
        title: row.title ?? null,
        content: row.content,
        visibility: row.visibility as PostVisibility,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

const JOINED_PROFILE_COLUMNS: Array<{ col: string; as: string }> = [
    { col: "p.account_id", as: "account_id" },
    { col: "p.handle", as: "handle" },
    { col: "p.display_name", as: "display_name" },
    { col: "p.role", as: "role" },
    { col: "p.bio", as: "bio" },
    { col: "p.location", as: "location" },
    { col: "p.website", as: "website" },
    { col: "p.avatar_key", as: "avatar_key" },
    { col: "p.banner_key", as: "banner_key" },
    { col: "p.visibility", as: "visibility" },
    { col: "p.created_at", as: "created_at" },
    { col: "p.updated_at", as: "updated_at" },
];

const SCHEMA_TABLE_DEFS: StructuredDbTableDef[] = [
    {
        name: "account_profiles",
        columns: [
            { name: "account_id", type: "text", primaryKey: true },
            { name: "handle", type: "text", notNull: true, unique: true },
            { name: "display_name", type: "text" },
            { name: "role", type: "text", notNull: true, default: "user" },
            { name: "bio", type: "text" },
            { name: "location", type: "text" },
            { name: "website", type: "text" },
            { name: "avatar_key", type: "text" },
            { name: "banner_key", type: "text" },
            {
                name: "visibility",
                type: "text",
                notNull: true,
                default: "hidden",
            },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
            {
                name: "updated_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
    },
    {
        name: "account_follows",
        columns: [
            { name: "follower_id", type: "text", notNull: true },
            { name: "following_id", type: "text", notNull: true },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["follower_id", "following_id"],
    },
    {
        name: "account_blocks",
        columns: [
            { name: "blocker_id", type: "text", notNull: true },
            { name: "blocked_id", type: "text", notNull: true },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["blocker_id", "blocked_id"],
    },
    {
        name: "posts",
        columns: [
            { name: "id", type: "text", primaryKey: true },
            { name: "account_id", type: "text", notNull: true },
            { name: "title", type: "text" },
            { name: "content", type: "text", notNull: true },
            {
                name: "visibility",
                type: "text",
                notNull: true,
                default: "community",
            },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
            {
                name: "updated_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
    },
    {
        name: "file_size_limits",
        columns: [
            { name: "category", type: "text", primaryKey: true },
            { name: "max_bytes", type: "bigint", notNull: true },
        ],
    },
];

export class DbProfileStore implements ProfileCreateStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        for (const def of SCHEMA_TABLE_DEFS) {
            await this.db.ensureTable(def);
        }
        await this.seedFileSizeLimits();
    }

    private async seedFileSizeLimits(): Promise<void> {
        const defaults: Array<[string, number]> = [
            ["image", 5_242_880],
            ["video", 104_857_600],
            ["text", 1_048_576],
            ["global", 10_485_760],
        ];
        for (const [category, maxBytes] of defaults) {
            await this.db.executeCommand({
                option: "INSERT",
                table: "file_size_limits",
                values: { category, max_bytes: maxBytes },
                conflict: { action: "ignore" },
            });
        }
    }

    async createProfile(
        accountId: string,
        handle: string,
        role: AccountRole = "user",
        displayName?: string,
    ): Promise<AccountProfile | null> {
        try {
            await this.db.executeCommand({
                option: "INSERT",
                table: "account_profiles",
                values: { account_id: accountId, handle, role },
                conflict: { action: "ignore" },
            });
            if (displayName) {
                await this.db.executeCommand({
                    option: "UPDATE",
                    table: "account_profiles",
                    set: { display_name: displayName },
                    where: [{ column: "account_id", value: accountId }],
                });
            }
            return this.getProfile(accountId);
        } catch {
            return null;
        }
    }

    async getProfile(accountId: string): Promise<AccountProfile | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "account_profiles",
            where: [{ column: "account_id", value: accountId }],
        });
        const row = result.rows?.[0];
        return row ? rowToProfile(row) : null;
    }

    async getProfileByHandle(handle: string): Promise<AccountProfile | null> {
        const normalizedHandle = normalizeHandleKey(handle);
        if (!normalizedHandle) return null;

        const exactResult = await this.db.executeCommand({
            option: "SELECT",
            table: "account_profiles",
            where: [{ column: "handle", value: handle }],
            limit: 1,
        });
        const exactRow = exactResult.rows?.[0];
        if (exactRow) {
            return rowToProfile(exactRow);
        }

        const profileHandleRowsResult = await this.db.executeCommand({
            option: "SELECT",
            table: "account_profiles",
            columns: ["account_id", "handle"],
        });
        const matchedHandleRow = (profileHandleRowsResult.rows ?? []).find(
            (profileHandleRow) =>
                normalizeHandleKey(String(profileHandleRow.handle ?? "")) ===
                normalizedHandle,
        );
        if (!matchedHandleRow?.account_id) {
            return null;
        }
        return this.getProfile(String(matchedHandleRow.account_id));
    }

    async searchProfiles(
        query: string,
        limit: number = 10,
    ): Promise<AccountProfile[]> {
        const pattern = query.toLowerCase().replace(/[\\%_]/g, "\\$&") + "%";

        const byHandle = await this.db.executeCommand({
            option: "SELECT",
            table: "account_profiles",
            where: [
                { column: "visibility", operator: "!=", value: "hidden" },
                {
                    column: "handle",
                    operator: "LIKE",
                    value: pattern,
                    escapeChar: "\\",
                },
            ],
        });

        const byDisplayName = await this.db.executeCommand({
            option: "SELECT",
            table: "account_profiles",
            where: [
                { column: "visibility", operator: "!=", value: "hidden" },
                {
                    column: "display_name",
                    operator: "LIKE",
                    value: pattern,
                    escapeChar: "\\",
                },
            ],
        });

        const seen = new Set<string>();
        const merged: AccountProfile[] = [];

        for (const row of [
            ...(byHandle.rows ?? []),
            ...(byDisplayName.rows ?? []),
        ]) {
            const profile = rowToProfile(row);
            if (!seen.has(profile.accountId)) {
                seen.add(profile.accountId);
                merged.push(profile);
            }
        }

        merged.sort((profileA, profileB) =>
            profileA.handle < profileB.handle
                ? -1
                : profileA.handle > profileB.handle
                  ? 1
                  : 0,
        );
        return merged.slice(0, limit);
    }

    async updateProfile(
        accountId: string,
        updates: Partial<
            Pick<
                AccountProfile,
                | "bio"
                | "location"
                | "website"
                | "visibility"
                | "avatarKey"
                | "bannerKey"
                | "displayName"
            >
        >,
    ): Promise<AccountProfile | null> {
        const fieldMap: Record<string, string> = {
            bio: "bio",
            location: "location",
            website: "website",
            visibility: "visibility",
            avatarKey: "avatar_key",
            bannerKey: "banner_key",
            displayName: "display_name",
        };

        const setRecord: Record<string, unknown> = {};

        for (const [key, col] of Object.entries(fieldMap)) {
            if (key in updates) {
                setRecord[col] = (updates as any)[key] ?? null;
            }
        }

        if (Object.keys(setRecord).length === 0)
            return this.getProfile(accountId);

        setRecord.updated_at = new Date().toISOString();

        await this.db.executeCommand({
            option: "UPDATE",
            table: "account_profiles",
            set: setRecord,
            where: [{ column: "account_id", value: accountId }],
        });
        return this.getProfile(accountId);
    }

    async setRoleByHandle(handle: string, role: AccountRole): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "account_profiles",
            set: { role, updated_at: new Date().toISOString() },
            where: [{ column: "handle", value: handle }],
        });
    }

    async getRole(accountId: string): Promise<AccountRole> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "account_profiles",
            columns: ["role"],
            where: [{ column: "account_id", value: accountId }],
        });
        return (result.rows?.[0]?.role as AccountRole) ?? "user";
    }

    async follow(followerId: string, followingId: string): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "account_follows",
            values: { follower_id: followerId, following_id: followingId },
            conflict: { action: "ignore" },
        });
    }

    async unfollow(followerId: string, followingId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "account_follows",
            where: [
                { column: "follower_id", value: followerId },
                { column: "following_id", value: followingId },
            ],
        });
    }

    async isFollowing(
        followerId: string,
        followingId: string,
    ): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "account_follows",
            count: true,
            where: [
                { column: "follower_id", value: followerId },
                { column: "following_id", value: followingId },
            ],
        });
        return Number(result.rows?.[0]?.cnt ?? 0) > 0;
    }

    async getFollowers(accountId: string): Promise<AccountProfile[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "account_follows",
            alias: "f",
            columns: JOINED_PROFILE_COLUMNS,
            joins: [
                {
                    type: "INNER",
                    table: "account_profiles",
                    alias: "p",
                    on: {
                        leftColumn: "p.account_id",
                        rightColumn: "f.follower_id",
                    },
                },
            ],
            where: [{ column: "f.following_id", value: accountId }],
            orderBy: [{ column: "f.created_at", direction: "DESC" }],
        });
        return (result.rows ?? []).map(rowToProfile);
    }

    async getFollowing(accountId: string): Promise<AccountProfile[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "account_follows",
            alias: "f",
            columns: JOINED_PROFILE_COLUMNS,
            joins: [
                {
                    type: "INNER",
                    table: "account_profiles",
                    alias: "p",
                    on: {
                        leftColumn: "p.account_id",
                        rightColumn: "f.following_id",
                    },
                },
            ],
            where: [{ column: "f.follower_id", value: accountId }],
            orderBy: [{ column: "f.created_at", direction: "DESC" }],
        });
        return (result.rows ?? []).map(rowToProfile);
    }

    async getFollowerCount(accountId: string): Promise<number> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "account_follows",
            count: true,
            where: [{ column: "following_id", value: accountId }],
        });
        return Number(result.rows?.[0]?.cnt ?? 0);
    }

    async getFollowingCount(accountId: string): Promise<number> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "account_follows",
            count: true,
            where: [{ column: "follower_id", value: accountId }],
        });
        return Number(result.rows?.[0]?.cnt ?? 0);
    }

    async block(blockerId: string, blockedId: string): Promise<void> {
        await this.unfollow(blockerId, blockedId);
        await this.unfollow(blockedId, blockerId);
        await this.db.executeCommand({
            option: "INSERT",
            table: "account_blocks",
            values: { blocker_id: blockerId, blocked_id: blockedId },
            conflict: { action: "ignore" },
        });
    }

    async unblock(blockerId: string, blockedId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "account_blocks",
            where: [
                { column: "blocker_id", value: blockerId },
                { column: "blocked_id", value: blockedId },
            ],
        });
    }

    async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "account_blocks",
            count: true,
            where: [
                { column: "blocker_id", value: blockerId },
                { column: "blocked_id", value: blockedId },
            ],
        });
        return Number(result.rows?.[0]?.cnt ?? 0) > 0;
    }

    async createPost(
        accountId: string,
        input: { title?: string; content: string; visibility: PostVisibility },
    ): Promise<Post> {
        const id = randomUUID();
        await this.db.executeCommand({
            option: "INSERT",
            table: "posts",
            values: {
                id,
                account_id: accountId,
                title: input.title ?? null,
                content: input.content,
                visibility: input.visibility,
            },
        });
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "posts",
            where: [{ column: "id", value: id }],
        });
        return rowToPost(result.rows![0]);
    }

    async getPostsByAccount(accountId: string): Promise<Post[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "posts",
            where: [{ column: "account_id", value: accountId }],
            orderBy: [{ column: "created_at", direction: "DESC" }],
        });
        return (result.rows ?? []).map(rowToPost);
    }

    async getPostById(postId: string): Promise<Post | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "posts",
            where: [{ column: "id", value: postId }],
        });
        const row = result.rows?.[0];
        return row ? rowToPost(row) : null;
    }

    async deletePost(postId: string): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "DELETE",
            table: "posts",
            where: [{ column: "id", value: postId }],
        });
        return (result.rowCount ?? 0) > 0;
    }

    async getFileSizeLimit(category: string): Promise<number> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "file_size_limits",
            columns: ["max_bytes"],
            where: [{ column: "category", value: category }],
        });
        if (result.rows?.length) return Number(result.rows[0].max_bytes);
        const fallback = await this.db.executeCommand({
            option: "SELECT",
            table: "file_size_limits",
            columns: ["max_bytes"],
            where: [{ column: "category", value: "global" }],
        });
        return Number(fallback.rows?.[0]?.max_bytes ?? 10_485_760);
    }

    async setFileSizeLimit(category: string, maxBytes: number): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "file_size_limits",
            values: { category, max_bytes: maxBytes },
            conflict: {
                action: "update",
                target: ["category"],
            },
        });
    }

    async getAllFileSizeLimits(): Promise<FileSizeLimit[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "file_size_limits",
            columns: ["category", "max_bytes"],
            orderBy: [{ column: "category" }],
        });
        return (result.rows ?? []).map((row) => ({
            category: row.category as string,
            maxBytes: Number(row.max_bytes),
        }));
    }
}
