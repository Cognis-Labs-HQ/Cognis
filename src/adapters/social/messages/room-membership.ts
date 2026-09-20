import type { MemberRow } from "./store/types.js";

export interface RoomMembershipResolution {
    authorized: boolean;
    memberAccountIds: string[];
}

interface RoomMembershipStore {
    getMember(roomId: string, accountId: string): Promise<MemberRow | null>;
    listMembers(roomId: string): Promise<MemberRow[]>;
}

export function createRoomMembershipResolver(store: RoomMembershipStore) {
    return async (input: {
        roomId?: unknown;
        requesterAccountId?: unknown;
    }): Promise<RoomMembershipResolution> => {
        const roomId = String(input?.roomId ?? "").trim();
        const requesterAccountId = String(
            input?.requesterAccountId ?? "",
        ).trim();
        if (!roomId || !requesterAccountId || roomId.length > 200) {
            return { authorized: false, memberAccountIds: [] };
        }

        const requester = await store.getMember(roomId, requesterAccountId);
        if (!requester || requester.archived) {
            return { authorized: false, memberAccountIds: [] };
        }

        const members = await store.listMembers(roomId);
        return {
            authorized: true,
            memberAccountIds: [
                ...new Set(
                    members
                        .filter((member) => !member.archived)
                        .map((member) => member.accountId),
                ),
            ],
        };
    };
}
