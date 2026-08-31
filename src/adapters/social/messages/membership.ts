import type { DbMessagesStore, MemberRow } from "./store.js";
import type { SocialMessagesProfileStore } from "./profile-store-contract.js";

export interface ChatroomMembershipMutation {
    roomId: string;
    actorAccountId: string;
    userAccountId: string;
}

export interface ChatroomMembershipCapability {
    add(input: ChatroomMembershipMutation): Promise<MemberRow>;
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
                role: "member",
                handle: profile?.handle ?? null,
                displayName: profile?.displayName ?? null,
            });
            const member = await messagesStore.getMember(
                input.roomId,
                input.userAccountId,
            );
            if (!member) {
                throw new Error("Chatroom member was not persisted.");
            }
            return member;
        },
        async remove(input) {
            const profile = await profileStore.getProfile(input.userAccountId);
            await messagesStore.removeMemberWithEvent({
                roomId: input.roomId,
                actorId: input.actorAccountId,
                accountId: input.userAccountId,
                handle: profile?.handle ?? null,
                displayName: profile?.displayName ?? null,
            });
        },
    };
}
