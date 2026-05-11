import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
export type {
    AccountRole,
    AccountVisibility,
    PostVisibility,
    AccountProfile,
    Post,
    FileSizeLimit,
    ProfileCreateStore,
    ProfileStore,
} from "../../../api/reuse/profile-store.js";
export { visibilityRank } from "../../../api/reuse/profile-store.js";
import type {
    AccountRole,
    AccountVisibility,
    PostVisibility,
    AccountProfile,
    Post,
    FileSizeLimit,
    ProfileCreateStore,
} from "../../../api/reuse/profile-store.js";

function rowToProfile(row: any): AccountProfile {
    return {
        accountId: row.account_id,
        handle: row.handle,
        displayName: row.display_name ?? null,
        role: row.role as AccountRole,
        bio: row.bio ?? null,
        location: row.location ?? null,
        website: row.website ?? null,
        avatarKey: row.avatar_key ?? null,
        bannerKey: row.banner_key ?? null,
        visibility: row.visibility as AccountVisibility,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

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

export class DbProfileStore implements ProfileCreateStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.execute(`CREATE TABLE IF NOT EXISTS account_profiles (
  account_id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  bio TEXT,
  location TEXT,
  website TEXT,
  avatar_key TEXT,
  banner_key TEXT,
  visibility TEXT NOT NULL DEFAULT 'hidden',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
)`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS account_follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES accounts(id) ON DELETE CASCADE
)`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS account_blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES accounts(id) ON DELETE CASCADE
)`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'community',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
)`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS file_size_limits (
  category TEXT PRIMARY KEY,
  max_bytes BIGINT NOT NULL
)`);
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
                await this.db.execute(
                    `UPDATE account_profiles SET display_name = ? WHERE account_id = ?`,
                    [displayName, accountId],
                );
            }
            return this.getProfile(accountId);
        } catch {
            return null;
        }
    }

    async getProfile(accountId: string): Promise<AccountProfile | null> {
        const result = await this.db.execute(
            `SELECT * FROM account_profiles WHERE account_id = ?`,
            [accountId],
        );
        const row = result.rows?.[0];
        return row ? rowToProfile(row) : null;
    }

    async getProfileByHandle(handle: string): Promise<AccountProfile | null> {
        const result = await this.db.execute(
            `SELECT * FROM account_profiles WHERE handle = ?`,
            [handle],
        );
        const row = result.rows?.[0];
        return row ? rowToProfile(row) : null;
    }

    async searchProfiles(
        query: string,
        limit: number = 10,
    ): Promise<AccountProfile[]> {
        const pattern = query.toLowerCase().replace(/[\\%_]/g, "\\$&") + "%";
        const result = await this.db.execute(
            `SELECT * FROM account_profiles
       WHERE visibility != 'hidden'
         AND (
           LOWER(handle) LIKE ? ESCAPE '\\'
           OR LOWER(COALESCE(display_name, '')) LIKE ? ESCAPE '\\'
         )
       ORDER BY handle ASC
       LIMIT ?`,
            [pattern, pattern, limit],
        );
        return (result.rows ?? []).map(rowToProfile);
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

        const setClauses: string[] = [];
        const params: unknown[] = [];

        for (const [key, col] of Object.entries(fieldMap)) {
            if (key in updates) {
                setClauses.push(`${col} = ?`);
                params.push((updates as any)[key] ?? null);
            }
        }

        if (setClauses.length === 0) return this.getProfile(accountId);

        setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(accountId);

        await this.db.execute(
            `UPDATE account_profiles SET ${setClauses.join(", ")} WHERE account_id = ?`,
            params,
        );
        return this.getProfile(accountId);
    }

    async setRoleByHandle(handle: string, role: AccountRole): Promise<void> {
        await this.db.execute(
            `UPDATE account_profiles SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE handle = ?`,
            [role, handle],
        );
    }

    async getRole(accountId: string): Promise<AccountRole> {
        const result = await this.db.execute(
            `SELECT role FROM account_profiles WHERE account_id = ?`,
            [accountId],
        );
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
        await this.db.execute(
            `DELETE FROM account_follows WHERE follower_id = ? AND following_id = ?`,
            [followerId, followingId],
        );
    }

    async isFollowing(
        followerId: string,
        followingId: string,
    ): Promise<boolean> {
        const result = await this.db.execute(
            `SELECT 1 FROM account_follows WHERE follower_id = ? AND following_id = ?`,
            [followerId, followingId],
        );
        return Boolean(result.rows?.length);
    }

    async getFollowers(accountId: string): Promise<AccountProfile[]> {
        const result = await this.db.execute(
            `SELECT p.* FROM account_follows f
       JOIN account_profiles p ON p.account_id = f.follower_id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC`,
            [accountId],
        );
        return (result.rows ?? []).map(rowToProfile);
    }

    async getFollowing(accountId: string): Promise<AccountProfile[]> {
        const result = await this.db.execute(
            `SELECT p.* FROM account_follows f
       JOIN account_profiles p ON p.account_id = f.following_id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`,
            [accountId],
        );
        return (result.rows ?? []).map(rowToProfile);
    }

    async getFollowerCount(accountId: string): Promise<number> {
        const result = await this.db.execute(
            `SELECT COUNT(*) AS cnt FROM account_follows WHERE following_id = ?`,
            [accountId],
        );
        return Number(result.rows?.[0]?.cnt ?? 0);
    }

    async getFollowingCount(accountId: string): Promise<number> {
        const result = await this.db.execute(
            `SELECT COUNT(*) AS cnt FROM account_follows WHERE follower_id = ?`,
            [accountId],
        );
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
        await this.db.execute(
            `DELETE FROM account_blocks WHERE blocker_id = ? AND blocked_id = ?`,
            [blockerId, blockedId],
        );
    }

    async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
        const result = await this.db.execute(
            `SELECT 1 FROM account_blocks WHERE blocker_id = ? AND blocked_id = ?`,
            [blockerId, blockedId],
        );
        return Boolean(result.rows?.length);
    }

    async createPost(
        accountId: string,
        input: { title?: string; content: string; visibility: PostVisibility },
    ): Promise<Post> {
        const id = randomUUID();
        await this.db.execute(
            `INSERT INTO posts (id, account_id, title, content, visibility)
       VALUES (?, ?, ?, ?, ?)`,
            [
                id,
                accountId,
                input.title ?? null,
                input.content,
                input.visibility,
            ],
        );
        const result = await this.db.execute(
            `SELECT * FROM posts WHERE id = ?`,
            [id],
        );
        return rowToPost(result.rows![0]);
    }

    async getPostsByAccount(accountId: string): Promise<Post[]> {
        const result = await this.db.execute(
            `SELECT * FROM posts WHERE account_id = ? ORDER BY created_at DESC`,
            [accountId],
        );
        return (result.rows ?? []).map(rowToPost);
    }

    async getPostById(postId: string): Promise<Post | null> {
        const result = await this.db.execute(
            `SELECT * FROM posts WHERE id = ?`,
            [postId],
        );
        const row = result.rows?.[0];
        return row ? rowToPost(row) : null;
    }

    async deletePost(postId: string): Promise<boolean> {
        const result = await this.db.execute(`DELETE FROM posts WHERE id = ?`, [
            postId,
        ]);
        return (result.rowCount ?? 0) > 0;
    }

    async getFileSizeLimit(category: string): Promise<number> {
        const result = await this.db.execute(
            `SELECT max_bytes FROM file_size_limits WHERE category = ?`,
            [category],
        );
        if (result.rows?.length) return Number(result.rows[0].max_bytes);
        const fallback = await this.db.execute(
            `SELECT max_bytes FROM file_size_limits WHERE category = ?`,
            ["global"],
        );
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
        const result = await this.db.execute(
            "SELECT category, max_bytes FROM file_size_limits ORDER BY category",
        );
        return (result.rows ?? []).map((row) => ({
            category: row.category,
            maxBytes: Number(row.max_bytes),
        }));
    }
}
