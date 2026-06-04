import { hasMinRole } from "@cognis/core";
import type { FlowApi } from "@cognis/core";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbMessagesStore, MemberRow } from "../store.js";
import type {
    SocialMessagesProfile,
    SocialMessagesProfileStore,
} from "../profile-store-contract.js";

export interface DispatchEnvelope {
    category: string;
    recipientUsername: string;
    subject: string;
    body: string;
    senderName?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}

export type Dispatch = (
    envelope: DispatchEnvelope,
) => Promise<{ dispatched: string[] }>;

export interface EnrichedMemberRow extends MemberRow {
    handle: string | null;
    displayName: string | null;
    avatarKey: string | null;
}

export function normalizeReactionEmoji(rawEmoji: string): string {
    return String(rawEmoji ?? "")
        .trim()
        .replace(/[\uFE0E\uFE0F]/g, "")
        .normalize("NFC");
}

export async function canMessage(
    profileStore: SocialMessagesProfileStore,
    fromId: string,
    toId: string,
): Promise<boolean> {
    if (fromId === toId) return false;
    const [requesterBlockedTarget, targetBlockedRequester] = await Promise.all([
        profileStore.isBlocked(fromId, toId),
        profileStore.isBlocked(toId, fromId),
    ]);
    if (requesterBlockedTarget || targetBlockedRequester) return false;
    const [requesterProfile, targetProfile] = await Promise.all([
        profileStore.getProfile(fromId),
        profileStore.getProfile(toId),
    ]);
    if (
        !requesterProfile ||
        !targetProfile ||
        requesterProfile.visibility === "hidden" ||
        targetProfile.visibility === "hidden"
    ) {
        return false;
    }
    const [requesterFollowsTarget, targetFollowsRequester] = await Promise.all([
        profileStore.isFollowing(fromId, toId),
        profileStore.isFollowing(toId, fromId),
    ]);
    return requesterFollowsTarget && targetFollowsRequester;
}

export async function canSendMessageRequest(
    profileStore: SocialMessagesProfileStore,
    fromId: string,
    toId: string,
): Promise<boolean> {
    if (fromId === toId) return false;
    const [requesterBlockedTarget, targetBlockedRequester] = await Promise.all([
        profileStore.isBlocked(fromId, toId),
        profileStore.isBlocked(toId, fromId),
    ]);
    if (requesterBlockedTarget || targetBlockedRequester) return false;
    const [requesterProfile, targetProfile] = await Promise.all([
        profileStore.getProfile(fromId),
        profileStore.getProfile(toId),
    ]);
    if (
        !requesterProfile ||
        !targetProfile ||
        requesterProfile.visibility === "hidden" ||
        targetProfile.visibility === "hidden"
    ) {
        return false;
    }
    return true;
}

export async function canDirectMessageNowOrByApprovedRequest(
    profileStore: SocialMessagesProfileStore,
    messagesStore: DbMessagesStore,
    fromId: string,
    toId: string,
): Promise<boolean> {
    const requestAllowed = await canSendMessageRequest(
        profileStore,
        fromId,
        toId,
    );
    if (!requestAllowed) return false;
    const directAllowed = await canMessage(profileStore, fromId, toId);
    if (directAllowed) return true;
    return messagesStore.hasApprovedMessageRequestBetween(fromId, toId);
}

export function hasAdminBypass(role: string | null | undefined): boolean {
    return Boolean(role && hasMinRole(role, "admin"));
}

export function publicProfileSummary(profile: SocialMessagesProfile) {
    return {
        accountId: profile.accountId,
        handle: profile.handle,
        displayName: profile.displayName ?? profile.handle,
        avatarKey: profile.avatarKey,
    };
}

export type PublicProfileSummary = ReturnType<typeof publicProfileSummary>;

export interface RoomRequestSummary {
    id: string;
    roomId: string | null;
    status: string;
    direction: "incoming" | "outgoing";
    requester: PublicProfileSummary | null;
    recipient: PublicProfileSummary | null;
    canRespond: boolean;
}

export interface MessagesRoutesDeps {
    messagesStore: DbMessagesStore;
    profileStore: SocialMessagesProfileStore;
    dispatch: Dispatch | null;
    isAdapterEnabled: () => boolean;
    routeContext?: RouteContext;
    flow?: FlowApi;
}

export async function enrichMembersWithProfiles(
    members: MemberRow[],
    profileStore: SocialMessagesProfileStore,
): Promise<EnrichedMemberRow[]> {
    return Promise.all(
        members.map(async (memberRow) => {
            const profile = await profileStore.getProfile(memberRow.accountId);
            return {
                ...memberRow,
                handle: profile?.handle ?? null,
                displayName: profile?.displayName ?? null,
                avatarKey: profile?.avatarKey ?? null,
            };
        }),
    );
}

export async function summarizeRoomRequest(
    request: Awaited<
        ReturnType<DbMessagesStore["getPendingRoomMessageRequest"]>
    >,
    profileStore: SocialMessagesProfileStore,
    accountId: string,
): Promise<RoomRequestSummary | null> {
    if (!request) return null;
    const [requester, recipient] = await Promise.all([
        profileStore.getProfile(request.fromAccountId),
        profileStore.getProfile(request.toAccountId),
    ]);
    return {
        id: request.id,
        roomId: request.roomId,
        status: request.status,
        direction: request.toAccountId === accountId ? "incoming" : "outgoing",
        requester: requester ? publicProfileSummary(requester) : null,
        recipient: recipient ? publicProfileSummary(recipient) : null,
        canRespond: request.toAccountId === accountId,
    };
}
