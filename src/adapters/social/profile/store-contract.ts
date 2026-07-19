/**
 * Abstract store contract and shared types used by the social profile API layer.
 * Concrete implementations (DB-backed) live in store.ts; this definition keeps
 * route handlers free of any adapter-specific import.
 *
 * @example
 *   import type { ProfileStore } from '../store-contract.js';
 *   export function createProfileRoutes(store: ProfileStore) { ... }
 *
 * @param getProfile      - Fetch a profile by internal account ID.
 * @param createProfile   - Create a profile for a new account.
 * @param updateProfile   - Partially update mutable profile fields.
 */

import { randomUUID } from "node:crypto";

export type AccountRole = "user" | "teacher" | "moderator" | "admin" | "owner";
export type AccountVisibility = "hidden" | "private" | "friends" | "community";
export type PostVisibility = "only_me" | "private" | "friends" | "community";

export interface AccountProfile {
    accountId: string;
    handle: string;
    displayName: string | null;
    role: AccountRole;
    bio: string | null;
    location: string | null;
    website: string | null;
    avatarKey: string | null;
    bannerKey: string | null;
    visibility: AccountVisibility;
    createdAt: string;
    updatedAt: string;
}

export interface Post {
    id: string;
    accountId: string;
    title: string | null;
    content: string;
    visibility: PostVisibility;
    createdAt: string;
    updatedAt: string;
}

export interface FileSizeLimit {
    category: string;
    maxBytes: number;
}

export interface ProfileCreateStore {
    createProfile(
        accountId: string,
        handle: string,
        role?: AccountRole,
    ): Promise<AccountProfile | null>;
    setRoleByHandle(handle: string, role: AccountRole): Promise<void>;
}

export interface ProfileSearchOptions {
    includeHidden?: boolean;
    requesterAccountId?: string;
    followingAccountId?: string;
    candidateHandles?: string[];
}

export interface ProfileStore extends ProfileCreateStore {
    getProfile(accountId: string): Promise<AccountProfile | null>;
    getProfileByHandle(handle: string): Promise<AccountProfile | null>;
    updateProfile(
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
    ): Promise<AccountProfile | null>;
    searchProfiles(
        query: string,
        limit?: number,
        options?: ProfileSearchOptions,
    ): Promise<AccountProfile[]>;
    getFollowers(accountId: string): Promise<AccountProfile[]>;
    getFollowing(accountId: string): Promise<AccountProfile[]>;
    getFollowerCount(accountId: string): Promise<number>;
    getFollowingCount(accountId: string): Promise<number>;
    getPostsByAccount(accountId: string): Promise<Post[]>;
    getFileSizeLimit(category: string): Promise<number>;
    isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
    isFollowing(followerId: string, followingId: string): Promise<boolean>;
}

const VISIBILITY_RANK: Record<AccountVisibility, number> = {
    hidden: 0,
    private: 1,
    friends: 2,
    community: 3,
};

export function visibilityRank(v: AccountVisibility): number {
    return VISIBILITY_RANK[v] ?? 0;
}

/**
 * In-memory implementation of ProfileStore for use in tests.
 * No persistence — state resets on every instantiation.
 */
export class VolatileProfileStore implements ProfileStore {
    private readonly profiles = new Map<string, AccountProfile>();
    private readonly byHandle = new Map<string, string>();
    private readonly posts = new Map<string, Post[]>();
    private readonly follows = new Set<string>();
    private readonly blocks = new Set<string>();
    private readonly fileSizeLimits = new Map<string, number>([
        ["image", 5_242_880],
        ["video", 104_857_600],
        ["text", 1_048_576],
        ["global", 10_485_760],
    ]);

    async createProfile(
        accountId: string,
        handle: string,
        role: AccountRole = "user",
    ): Promise<AccountProfile | null> {
        if (this.profiles.has(accountId)) return this.profiles.get(accountId)!;
        const now = new Date().toISOString();
        const profile: AccountProfile = {
            accountId,
            handle,
            displayName: null,
            role,
            bio: null,
            location: null,
            website: null,
            avatarKey: null,
            bannerKey: null,
            visibility: "hidden",
            createdAt: now,
            updatedAt: now,
        };
        this.profiles.set(accountId, profile);
        this.byHandle.set(handle, accountId);
        return profile;
    }

    async setRoleByHandle(handle: string, role: AccountRole): Promise<void> {
        const accountId = this.byHandle.get(handle);
        if (!accountId) return;
        const profile = this.profiles.get(accountId);
        if (profile) profile.role = role;
    }

    async getProfile(accountId: string): Promise<AccountProfile | null> {
        return this.profiles.get(accountId) ?? null;
    }

    async getProfileByHandle(handle: string): Promise<AccountProfile | null> {
        const accountId = this.byHandle.get(handle);
        if (!accountId) return null;
        return this.profiles.get(accountId) ?? null;
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
        const profile = this.profiles.get(accountId);
        if (!profile) return null;
        Object.assign(profile, updates);
        profile.updatedAt = new Date().toISOString();
        return profile;
    }

    async searchProfiles(
        query: string,
        limit: number = 10,
        options: ProfileSearchOptions = {},
    ): Promise<AccountProfile[]> {
        const normalizedQuery = String(query ?? "")
            .trim()
            .toLowerCase();
        const requesterAccountId = String(
            options.requesterAccountId ?? "",
        ).trim();
        const followingAccountId = String(
            options.followingAccountId ?? "",
        ).trim();
        const candidateHandles = Array.isArray(options.candidateHandles)
            ? new Set(
                  options.candidateHandles
                      .map((handle) =>
                          String(handle ?? "")
                              .trim()
                              .toLowerCase(),
                      )
                      .filter(Boolean),
              )
            : null;
        const allowedFollowedIds = followingAccountId
            ? new Set(
                  (await this.getFollowing(followingAccountId)).map(
                      (profile) => profile.accountId,
                  ),
              )
            : null;
        const results: AccountProfile[] = [];
        const sortedProfiles = Array.from(this.profiles.values()).sort(
            (profileA, profileB) =>
                profileA.handle < profileB.handle
                    ? -1
                    : profileA.handle > profileB.handle
                      ? 1
                      : 0,
        );
        for (const profile of sortedProfiles) {
            const handle = profile.handle.toLowerCase();
            const displayName = String(profile.displayName ?? "")
                .trim()
                .toLowerCase();
            if (candidateHandles && !candidateHandles.has(handle)) continue;
            if (
                allowedFollowedIds &&
                !allowedFollowedIds.has(profile.accountId)
            ) {
                continue;
            }
            if (!options.includeHidden && profile.visibility === "hidden")
                continue;
            if (
                normalizedQuery &&
                !handle.startsWith(normalizedQuery) &&
                !displayName.startsWith(normalizedQuery)
            ) {
                continue;
            }
            if (
                requesterAccountId &&
                profile.accountId !== requesterAccountId
            ) {
                if (
                    await this.isBlocked(profile.accountId, requesterAccountId)
                ) {
                    continue;
                }
            }
            results.push(profile);
            if (results.length >= limit) break;
        }
        return results;
    }

    async getFollowers(accountId: string): Promise<AccountProfile[]> {
        const profiles: AccountProfile[] = [];
        for (const key of this.follows) {
            const [followerId, followingId] = key.split(":");
            if (followingId !== accountId) continue;
            const profile = this.profiles.get(followerId);
            if (profile) profiles.push(profile);
        }
        return profiles;
    }

    async getFollowing(accountId: string): Promise<AccountProfile[]> {
        const profiles: AccountProfile[] = [];
        for (const key of this.follows) {
            const [followerId, followingId] = key.split(":");
            if (followerId !== accountId) continue;
            const profile = this.profiles.get(followingId);
            if (profile) profiles.push(profile);
        }
        return profiles;
    }

    async getFollowerCount(accountId: string): Promise<number> {
        let count = 0;
        for (const key of this.follows) {
            if (key.endsWith(`:${accountId}`)) count++;
        }
        return count;
    }

    async getFollowingCount(accountId: string): Promise<number> {
        let count = 0;
        for (const key of this.follows) {
            if (key.startsWith(`${accountId}:`)) count++;
        }
        return count;
    }

    async getPostsByAccount(accountId: string): Promise<Post[]> {
        return this.posts.get(accountId) ?? [];
    }

    async getFileSizeLimit(category: string): Promise<number> {
        return (
            this.fileSizeLimits.get(category) ??
            this.fileSizeLimits.get("global") ??
            10_485_760
        );
    }

    async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
        return this.blocks.has(`${blockerId}:${blockedId}`);
    }

    async isFollowing(
        followerId: string,
        followingId: string,
    ): Promise<boolean> {
        return this.follows.has(`${followerId}:${followingId}`);
    }

    addPost(
        accountId: string,
        post: Partial<Post> & { content: string },
    ): Post {
        const full: Post = {
            id: post.id ?? randomUUID(),
            accountId,
            title: post.title ?? null,
            content: post.content,
            visibility: post.visibility ?? "community",
            createdAt: post.createdAt ?? new Date().toISOString(),
            updatedAt: post.updatedAt ?? new Date().toISOString(),
        };
        const list = this.posts.get(accountId) ?? [];
        list.push(full);
        this.posts.set(accountId, list);
        return full;
    }

    async follow(followerId: string, followingId: string): Promise<void> {
        this.follows.add(`${followerId}:${followingId}`);
    }

    async unfollow(followerId: string, followingId: string): Promise<void> {
        this.follows.delete(`${followerId}:${followingId}`);
    }

    async block(blockerId: string, blockedId: string): Promise<void> {
        this.follows.delete(`${blockerId}:${blockedId}`);
        this.follows.delete(`${blockedId}:${blockerId}`);
        this.blocks.add(`${blockerId}:${blockedId}`);
    }

    async unblock(blockerId: string, blockedId: string): Promise<void> {
        this.blocks.delete(`${blockerId}:${blockedId}`);
    }

    setFileSizeLimit(category: string, maxBytes: number): void {
        this.fileSizeLimits.set(category, maxBytes);
    }
}
