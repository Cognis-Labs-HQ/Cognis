import { randomUUID } from "node:crypto";
import type { SupportedDbType } from "./account-store.js";
import type { DbExecutor } from "./account-store.js";
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
    constructor(
        private readonly db: DbExecutor,
        private readonly dbType: SupportedDbType,
    ) {}

    private p(index: number): string {
        return this.dbType === "postgresql" ? `$${index}` : "?";
    }

    private nowExpr(): string {
        return this.dbType === "postgresql" ? "NOW()" : "CURRENT_TIMESTAMP";
    }

    async ensureSchema(): Promise<void> {
        if (this.dbType === "postgresql") {
            await this.ensureSchemaPostgresql();
        } else {
            await this.ensureSchemaMariadb();
        }
        await this.seedFileSizeLimits();
    }

    private async ensureSchemaPostgresql(): Promise<void> {
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS account_follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS account_blocks (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS file_size_limits (
      category TEXT PRIMARY KEY,
      max_bytes BIGINT NOT NULL
    )`);
    }

    private async ensureSchemaMariadb(): Promise<void> {
        await this.db.execute(`CREATE TABLE IF NOT EXISTS account_profiles (
      account_id VARCHAR(191) PRIMARY KEY,
      handle VARCHAR(191) NOT NULL UNIQUE,
      display_name VARCHAR(255) DEFAULT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'user',
      bio TEXT,
      location VARCHAR(255),
      website VARCHAR(2048),
      avatar_key VARCHAR(512),
      banner_key VARCHAR(512),
      visibility VARCHAR(32) NOT NULL DEFAULT 'hidden',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS account_follows (
      follower_id VARCHAR(191) NOT NULL,
      following_id VARCHAR(191) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS account_blocks (
      blocker_id VARCHAR(191) NOT NULL,
      blocked_id VARCHAR(191) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (blocker_id, blocked_id),
      FOREIGN KEY (blocker_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (blocked_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS posts (
      id VARCHAR(191) PRIMARY KEY,
      account_id VARCHAR(191) NOT NULL,
      title VARCHAR(512),
      content LONGTEXT NOT NULL,
      visibility VARCHAR(32) NOT NULL DEFAULT 'community',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    )`);
        await this.db.execute(`CREATE TABLE IF NOT EXISTS file_size_limits (
      category VARCHAR(64) PRIMARY KEY,
      max_bytes BIGINT NOT NULL
    )`);
    }

    private async seedFileSizeLimits(): Promise<void> {
        const defaults: Array<[string, number]> = [
            ["image", 5_242_880],
            ["video", 104_857_600],
            ["text", 1_048_576],
            ["global", 10_485_760],
        ];
        for (const [category, maxBytes] of defaults) {
            if (this.dbType === "postgresql") {
                await this.db.execute(
                    `INSERT INTO file_size_limits (category, max_bytes) VALUES (${this.p(1)}, ${this.p(2)}) ON CONFLICT (category) DO NOTHING`,
                    [category, maxBytes],
                );
            } else {
                await this.db.execute(
                    `INSERT IGNORE INTO file_size_limits (category, max_bytes) VALUES (${this.p(1)}, ${this.p(2)})`,
                    [category, maxBytes],
                );
            }
        }
    }

    async createProfile(
        accountId: string,
        handle: string,
        role: AccountRole = "user",
        displayName?: string,
    ): Promise<AccountProfile | null> {
        try {
            if (this.dbType === "postgresql") {
                await this.db.execute(
                    `INSERT INTO account_profiles (account_id, handle, role) VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)}) ON CONFLICT (account_id) DO NOTHING`,
                    [accountId, handle, role],
                );
            } else {
                await this.db.execute(
                    `INSERT IGNORE INTO account_profiles (account_id, handle, role) VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)})`,
                    [accountId, handle, role],
                );
            }
            if (displayName) {
                await this.db.execute(
                    `UPDATE account_profiles SET display_name = ${this.p(1)} WHERE account_id = ${this.p(2)}`,
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
            `SELECT * FROM account_profiles WHERE account_id = ${this.p(1)}`,
            [accountId],
        );
        const row = result.rows?.[0];
        return row ? rowToProfile(row) : null;
    }

    async getProfileByHandle(handle: string): Promise<AccountProfile | null> {
        const result = await this.db.execute(
            `SELECT * FROM account_profiles WHERE handle = ${this.p(1)}`,
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
               AND LOWER(handle) LIKE ${this.p(1)} ESCAPE '\\'
             ORDER BY handle ASC
             LIMIT ${this.p(2)}`,
            [pattern, limit],
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
        let idx = 1;

        for (const [key, col] of Object.entries(fieldMap)) {
            if (key in updates) {
                setClauses.push(`${col} = ${this.p(idx++)}`);
                params.push((updates as any)[key] ?? null);
            }
        }

        if (setClauses.length === 0) return this.getProfile(accountId);

        setClauses.push(`updated_at = ${this.nowExpr()}`);
        params.push(accountId);

        await this.db.execute(
            `UPDATE account_profiles SET ${setClauses.join(", ")} WHERE account_id = ${this.p(idx)}`,
            params,
        );
        return this.getProfile(accountId);
    }

    async setRoleByHandle(handle: string, role: AccountRole): Promise<void> {
        await this.db.execute(
            `UPDATE account_profiles SET role = ${this.p(1)}, updated_at = ${this.nowExpr()} WHERE handle = ${this.p(2)}`,
            [role, handle],
        );
    }

    async getRole(accountId: string): Promise<AccountRole> {
        const result = await this.db.execute(
            `SELECT role FROM account_profiles WHERE account_id = ${this.p(1)}`,
            [accountId],
        );
        return (result.rows?.[0]?.role as AccountRole) ?? "user";
    }

    async follow(followerId: string, followingId: string): Promise<void> {
        if (this.dbType === "postgresql") {
            await this.db.execute(
                `INSERT INTO account_follows (follower_id, following_id) VALUES (${this.p(1)}, ${this.p(2)}) ON CONFLICT DO NOTHING`,
                [followerId, followingId],
            );
        } else {
            await this.db.execute(
                `INSERT IGNORE INTO account_follows (follower_id, following_id) VALUES (${this.p(1)}, ${this.p(2)})`,
                [followerId, followingId],
            );
        }
    }

    async unfollow(followerId: string, followingId: string): Promise<void> {
        await this.db.execute(
            `DELETE FROM account_follows WHERE follower_id = ${this.p(1)} AND following_id = ${this.p(2)}`,
            [followerId, followingId],
        );
    }

    async isFollowing(
        followerId: string,
        followingId: string,
    ): Promise<boolean> {
        const result = await this.db.execute(
            `SELECT 1 FROM account_follows WHERE follower_id = ${this.p(1)} AND following_id = ${this.p(2)}`,
            [followerId, followingId],
        );
        return Boolean(result.rows?.length);
    }

    async getFollowers(accountId: string): Promise<AccountProfile[]> {
        const result = await this.db.execute(
            `SELECT p.* FROM account_follows f
       JOIN account_profiles p ON p.account_id = f.follower_id
       WHERE f.following_id = ${this.p(1)}
       ORDER BY f.created_at DESC`,
            [accountId],
        );
        return (result.rows ?? []).map(rowToProfile);
    }

    async getFollowing(accountId: string): Promise<AccountProfile[]> {
        const result = await this.db.execute(
            `SELECT p.* FROM account_follows f
       JOIN account_profiles p ON p.account_id = f.following_id
       WHERE f.follower_id = ${this.p(1)}
       ORDER BY f.created_at DESC`,
            [accountId],
        );
        return (result.rows ?? []).map(rowToProfile);
    }

    async getFollowerCount(accountId: string): Promise<number> {
        const result = await this.db.execute(
            `SELECT COUNT(*) AS cnt FROM account_follows WHERE following_id = ${this.p(1)}`,
            [accountId],
        );
        return Number(result.rows?.[0]?.cnt ?? 0);
    }

    async getFollowingCount(accountId: string): Promise<number> {
        const result = await this.db.execute(
            `SELECT COUNT(*) AS cnt FROM account_follows WHERE follower_id = ${this.p(1)}`,
            [accountId],
        );
        return Number(result.rows?.[0]?.cnt ?? 0);
    }

    async block(blockerId: string, blockedId: string): Promise<void> {
        await this.unfollow(blockerId, blockedId);
        await this.unfollow(blockedId, blockerId);
        if (this.dbType === "postgresql") {
            await this.db.execute(
                `INSERT INTO account_blocks (blocker_id, blocked_id) VALUES (${this.p(1)}, ${this.p(2)}) ON CONFLICT DO NOTHING`,
                [blockerId, blockedId],
            );
        } else {
            await this.db.execute(
                `INSERT IGNORE INTO account_blocks (blocker_id, blocked_id) VALUES (${this.p(1)}, ${this.p(2)})`,
                [blockerId, blockedId],
            );
        }
    }

    async unblock(blockerId: string, blockedId: string): Promise<void> {
        await this.db.execute(
            `DELETE FROM account_blocks WHERE blocker_id = ${this.p(1)} AND blocked_id = ${this.p(2)}`,
            [blockerId, blockedId],
        );
    }

    async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
        const result = await this.db.execute(
            `SELECT 1 FROM account_blocks WHERE blocker_id = ${this.p(1)} AND blocked_id = ${this.p(2)}`,
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
       VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)}, ${this.p(4)}, ${this.p(5)})`,
            [
                id,
                accountId,
                input.title ?? null,
                input.content,
                input.visibility,
            ],
        );
        const result = await this.db.execute(
            `SELECT * FROM posts WHERE id = ${this.p(1)}`,
            [id],
        );
        return rowToPost(result.rows![0]);
    }

    async getPostsByAccount(accountId: string): Promise<Post[]> {
        const result = await this.db.execute(
            `SELECT * FROM posts WHERE account_id = ${this.p(1)} ORDER BY created_at DESC`,
            [accountId],
        );
        return (result.rows ?? []).map(rowToPost);
    }

    async getPostById(postId: string): Promise<Post | null> {
        const result = await this.db.execute(
            `SELECT * FROM posts WHERE id = ${this.p(1)}`,
            [postId],
        );
        const row = result.rows?.[0];
        return row ? rowToPost(row) : null;
    }

    async deletePost(postId: string): Promise<boolean> {
        const result = await this.db.execute(
            `DELETE FROM posts WHERE id = ${this.p(1)}`,
            [postId],
        );
        return (result.rowCount ?? 0) > 0;
    }

    async getFileSizeLimit(category: string): Promise<number> {
        const result = await this.db.execute(
            `SELECT max_bytes FROM file_size_limits WHERE category = ${this.p(1)}`,
            [category],
        );
        if (result.rows?.length) return Number(result.rows[0].max_bytes);
        const fallback = await this.db.execute(
            `SELECT max_bytes FROM file_size_limits WHERE category = ${this.p(1)}`,
            ["global"],
        );
        return Number(fallback.rows?.[0]?.max_bytes ?? 10_485_760);
    }

    async setFileSizeLimit(category: string, maxBytes: number): Promise<void> {
        if (this.dbType === "postgresql") {
            await this.db.execute(
                `INSERT INTO file_size_limits (category, max_bytes) VALUES (${this.p(1)}, ${this.p(2)})
         ON CONFLICT (category) DO UPDATE SET max_bytes = EXCLUDED.max_bytes`,
                [category, maxBytes],
            );
        } else {
            await this.db.execute(
                `INSERT INTO file_size_limits (category, max_bytes) VALUES (${this.p(1)}, ${this.p(2)})
         ON DUPLICATE KEY UPDATE max_bytes = VALUES(max_bytes)`,
                [category, maxBytes],
            );
        }
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
