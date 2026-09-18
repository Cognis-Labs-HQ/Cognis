export type SocialMessagesProfileVisibility =
    | "hidden"
    | "private"
    | "friends"
    | "community";

export interface SocialMessagesProfile {
    accountId: string;
    handle: string;
    displayName: string | null;
    role: string;
    avatarKey: string | null;
    visibility: SocialMessagesProfileVisibility;
}

export interface SocialMessagesProfileStore {
    getProfile(accountId: string): Promise<SocialMessagesProfile | null>;
    getProfileByHandle(handle: string): Promise<SocialMessagesProfile | null>;
    searchProfiles(
        query: string,
        limit?: number,
        options?: { includeHidden?: boolean },
    ): Promise<SocialMessagesProfile[]>;
    isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
    isFollowing(followerId: string, followingId: string): Promise<boolean>;
}
