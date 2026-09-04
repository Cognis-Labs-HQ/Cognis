import type { DbProfileStore } from "./store.js";

export interface FollowerMutation {
    followerAccountId: string;
    followedAccountId: string;
}

export interface FollowersCapability {
    add(input: FollowerMutation): Promise<void>;
    remove(input: FollowerMutation): Promise<void>;
}

export function createFollowersCapability(
    profileStore: DbProfileStore,
): FollowersCapability {
    return {
        add: ({ followerAccountId, followedAccountId }) =>
            profileStore.follow(followerAccountId, followedAccountId),
        remove: ({ followerAccountId, followedAccountId }) =>
            profileStore.unfollow(followerAccountId, followedAccountId),
    };
}
