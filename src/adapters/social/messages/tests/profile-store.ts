import type {
    SocialMessagesProfile,
    SocialMessagesProfileStore,
} from "../profile-store-contract.js";

export class MessagesProfileStore implements SocialMessagesProfileStore {
    private readonly profiles = new Map<string, SocialMessagesProfile>();
    private readonly follows = new Set<string>();
    private readonly blocks = new Set<string>();

    async createProfile(
        accountId: string,
        handle: string,
        role = "user",
    ): Promise<SocialMessagesProfile> {
        const profile: SocialMessagesProfile = {
            accountId,
            handle,
            role,
            displayName: null,
            avatarKey: null,
            visibility: "friends",
        };
        this.profiles.set(accountId, profile);
        return profile;
    }

    async updateProfile(
        accountId: string,
        updates: Partial<SocialMessagesProfile>,
    ): Promise<SocialMessagesProfile | null> {
        const profile = this.profiles.get(accountId);
        if (!profile) return null;
        Object.assign(profile, updates);
        return profile;
    }

    async getProfile(accountId: string): Promise<SocialMessagesProfile | null> {
        return this.profiles.get(accountId) ?? null;
    }

    async getProfileByHandle(
        handle: string,
    ): Promise<SocialMessagesProfile | null> {
        return (
            [...this.profiles.values()].find(
                (profile) => profile.handle === handle,
            ) ?? null
        );
    }

    async searchProfiles(
        query: string,
        limit?: number,
        options?: { includeHidden?: boolean },
    ): Promise<SocialMessagesProfile[]> {
        const matches = [...this.profiles.values()].filter(
            (profile) =>
                (options?.includeHidden || profile.visibility !== "hidden") &&
                profile.handle.startsWith(query),
        );
        return limit === undefined ? matches : matches.slice(0, limit);
    }

    async follow(follower: string, following: string): Promise<void> {
        this.follows.add(`${follower}:${following}`);
    }

    async isFollowing(follower: string, following: string): Promise<boolean> {
        return this.follows.has(`${follower}:${following}`);
    }

    async isBlocked(blocker: string, blocked: string): Promise<boolean> {
        return this.blocks.has(`${blocker}:${blocked}`);
    }
}
