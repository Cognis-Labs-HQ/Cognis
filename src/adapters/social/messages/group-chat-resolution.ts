import type { BootstrapLog } from "@cognis/core";
import type { DbMessagesStore } from "./store.js";
import type { SocialMessagesProfileStore } from "./profile-store-contract.js";
import type { createChatroomMembershipCapability } from "./membership.js";

export interface GroupChatInput {
    usernames: string[];
    title?: string | null;
    createdByAccountId?: string;
    allowSingleMember?: boolean;
    reuseExisting?: boolean;
    roomId?: string;
    source?: { sourceType: string; sourceId: string };
}

export interface GroupChatResolution {
    roomId: string;
    url: string;
    reused: boolean;
}

export function createGroupChatResolver(
    messagesStore: DbMessagesStore,
    profileStore: SocialMessagesProfileStore,
    membership: ReturnType<typeof createChatroomMembershipCapability>,
    log?: BootstrapLog,
): (input: GroupChatInput) => Promise<GroupChatResolution> {
    return async (input: GroupChatInput): Promise<GroupChatResolution> => {
        const normalizedUsernames = Array.from(
            new Set(
                (Array.isArray(input.usernames) ? input.usernames : [])
                    .map((username) =>
                        String(username ?? "")
                            .trim()
                            .replace(/^@+/, "")
                            .toLowerCase(),
                    )
                    .filter(Boolean),
            ),
        );
        const accountIds: string[] = [];
        if (input.createdByAccountId) {
            accountIds.push(String(input.createdByAccountId));
        }
        for (const username of normalizedUsernames) {
            const profile = await profileStore.getProfileByHandle(username);
            if (!profile?.accountId) continue;
            if (!accountIds.includes(profile.accountId)) {
                accountIds.push(profile.accountId);
            }
        }
        const minAccounts = input.allowSingleMember ? 1 : 2;
        if (accountIds.length < minAccounts) {
            throw new Error(
                minAccounts === 1
                    ? "At least one valid participant is required for group chat resolution."
                    : "At least two valid participants are required for group chat resolution.",
            );
        }

        const title =
            typeof input.title === "string" && input.title.trim().length > 0
                ? input.title.trim()
                : null;
        const requestedRoomId = String(input.roomId ?? "").trim();
        if (requestedRoomId.length > 200)
            throw new Error("Invalid group chat identity.");
        const existing = requestedRoomId
            ? await messagesStore.getRoom(requestedRoomId)
            : input.reuseExisting === false
              ? null
              : await messagesStore.findGroupByExactMembers(accountIds);
        if (existing) {
            if (input.source)
                await messagesStore.bindSource({
                    roomId: existing.id,
                    actorAccountId: String(
                        input.createdByAccountId ?? accountIds[0],
                    ),
                    ...input.source,
                });
            return {
                roomId: existing.id,
                url: `/messages/${encodeURIComponent(existing.id)}`,
                reused: true,
            };
        }

        const ownerAccountId = String(
            input.createdByAccountId ?? accountIds[0],
        );
        const room = await messagesStore.createRoom(
            "group",
            title,
            ownerAccountId,
        );
        try {
            await messagesStore.generateAndStoreRoomKey(room.id);
            for (const accountId of accountIds) {
                await membership.add({
                    roomId: room.id,
                    actorAccountId: ownerAccountId,
                    userAccountId: accountId,
                    role: accountId === ownerAccountId ? "owner" : "member",
                });
            }
            if (input.source)
                await messagesStore.bindSource({
                    roomId: room.id,
                    actorAccountId: ownerAccountId,
                    ...input.source,
                });
        } catch (error) {
            log?.("error", "Group room initialization failed.", {
                component: "social-messages",
                operation: "resolve_group",
                roomId: room.id,
                errorName: error instanceof Error ? error.name : "Unknown",
            });
            try {
                await messagesStore.deleteRoom(room.id);
            } catch (cleanupError) {
                log?.("error", "Partial group room cleanup failed.", {
                    component: "social-messages",
                    operation: "cleanup_group",
                    roomId: room.id,
                    errorName:
                        cleanupError instanceof Error
                            ? cleanupError.name
                            : "Unknown",
                });
                throw new AggregateError(
                    [error, cleanupError],
                    "group_room_setup_failed",
                );
            }
            throw error;
        }
        return {
            roomId: room.id,
            url: `/messages/${encodeURIComponent(room.id)}`,
            reused: false,
        };
    };
}
