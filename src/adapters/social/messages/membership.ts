import type { DbMessagesStore } from "./store.js";
import type { SocialMessagesProfileStore } from "./profile-store-contract.js";

export interface ChatroomMembershipMutation {
    roomId: string;
    actorAccountId: string;
    userAccountId: string;
    role?: "owner" | "admin" | "member";
    userHandle?: string | null;
    userDisplayName?: string | null;
}

export interface ChatroomMembershipCapability {
    add(input: ChatroomMembershipMutation): Promise<void>;
    remove(input: ChatroomMembershipMutation): Promise<void>;
}

export function createChatroomMembershipCapability(
    messagesStore: DbMessagesStore,
    profileStore: SocialMessagesProfileStore,
): ChatroomMembershipCapability {
    return {
        async add(input) {
            const profile = await profileStore.getProfile(input.userAccountId);
            await messagesStore.addMemberWithEvent({
                roomId: input.roomId,
                actorId: input.actorAccountId,
                accountId: input.userAccountId,
                role: input.role ?? "member",
                handle: input.userHandle ?? profile?.handle ?? null,
                displayName:
                    input.userDisplayName ?? profile?.displayName ?? null,
            });
        },
        async remove(input) {
            const profile = await profileStore.getProfile(input.userAccountId);
            await messagesStore.removeMemberWithEvent({
                roomId: input.roomId,
                actorId: input.actorAccountId,
                accountId: input.userAccountId,
                handle: input.userHandle ?? profile?.handle ?? null,
                displayName:
                    input.userDisplayName ?? profile?.displayName ?? null,
            });
        },
    };
}
