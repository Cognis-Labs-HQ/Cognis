import { resolveStore } from "./reuse/store-runtime.js";
import { resolveRequesterUsername } from "./reuse/requester.js";
import { getFirstStageResult } from "../../../api/reuse/flow-helpers.js";
import {
    resolveMessagesUiResources,
    resolveSharedMessagesStylesheetUrls,
} from "./ui-resources.js";

/**
 * Determines whether an already-authenticated requester (identified by
 * their real account claims, not a share-guest token) already has direct
 * access to the meeting through their own account — either as the meeting
 * owner or as an invited participant. Used so that logged-in users who
 * follow a share link render the meeting through their own session instead
 * of being downgraded to a guest.
 *
 * @param {object} ctx
 * @param {{ sub?: string }} requesterClaims
 * @param {string} meetingId
 * @returns {Promise<boolean>}
 */
async function requesterHasDirectMeetingAccess(
    ctx,
    requesterClaims,
    meetingId,
) {
    const dbExecutor = ctx.getCapability("db:executor");
    const profileStore = ctx.getCapability("social:profileStore");
    const log = ctx.getCapability("logging:log");
    if (!dbExecutor || !profileStore || !meetingId) {
        return false;
    }
    const store = resolveStore(dbExecutor, log);
    await store.ensureSchema();
    const requesterUsername = await resolveRequesterUsername(
        profileStore,
        String(requesterClaims?.sub ?? ""),
    ).catch(() => "");
    if (!requesterUsername) {
        return false;
    }
    const meeting = await store.getMeetingById(meetingId);
    if (!meeting) {
        return false;
    }
    if (requesterUsername === meeting.createdBy) {
        return true;
    }
    const participants = await store
        .listParticipants(meeting.id)
        .catch(() => []);
    return participants.includes(requesterUsername);
}

async function resolveMeetingRequesterAccess({
    store,
    profileStore,
    requesterAccountId,
    meeting,
}) {
    const requesterUsername = await resolveRequesterUsername(
        profileStore,
        requesterAccountId,
    ).catch(() => "");
    if (!requesterUsername) {
        return { isParticipant: false };
    }
    const participantUsernames = await store
        .listParticipants(meeting.id)
        .catch(() => []);
    return {
        isParticipant:
            requesterUsername === meeting.createdBy ||
            participantUsernames.includes(requesterUsername),
    };
}

export function registerShareFlowHooks(ctx) {
    if (
        !ctx.flow.exists("mint-share-token") ||
        !ctx.flow.exists("resolve-share-token")
    ) {
        return;
    }

    if (ctx.flow.exists("resolve-share-approval-targets")) {
        ctx.flow.extend(
            "resolve-share-approval-targets",
            "resolve-targets",
            { id: "jitsi-meet:resolve-meeting-share-approval-targets" },
            async (stageCtx) => {
                const input = stageCtx.input ?? {};
                if (String(input.resourceType ?? "") !== "meeting") {
                    return null;
                }
                const dbExecutor = ctx.getCapability("db:executor");
                const profileStore = ctx.getCapability("social:profileStore");
                const log = ctx.getCapability("logging:log");
                if (!dbExecutor || !profileStore) {
                    return { targetAccountIds: [] };
                }
                const store = resolveStore(dbExecutor, log);
                await store.ensureSchema();
                const meeting = await store.getMeetingById(
                    String(input.resourceId ?? ""),
                );
                if (!meeting) {
                    return { targetAccountIds: [] };
                }
                const usernames = await store.listParticipants(meeting.id);
                const presenceEntries = await store.listPresence(meeting.id);
                const activeUsernames = new Set(
                    store
                        .filterCurrentPresenceEntries(presenceEntries)
                        .map((entry) => entry.username),
                );
                const presentParticipants = usernames.filter((username) =>
                    activeUsernames.has(username),
                );
                const requesterAccountId = String(
                    input.requesterAccountId ?? "",
                );
                const profiles = await Promise.all(
                    presentParticipants.map((username) =>
                        profileStore
                            .getProfileByHandle(username)
                            .catch(() => null),
                    ),
                );
                const targetAccountIds = profiles
                    .map((profile) => profile?.accountId ?? "")
                    .filter(
                        (accountId) =>
                            Boolean(accountId) &&
                            accountId !== requesterAccountId,
                    );
                const requesterProfile = await profileStore
                    .getProfile(requesterAccountId)
                    .catch(() => null);
                return {
                    targetAccountIds,
                    requesterDisplayName:
                        requesterProfile?.displayName ??
                        requesterProfile?.handle ??
                        requesterAccountId,
                };
            },
        );
    }

    ctx.flow.extend(
        "mint-share-token",
        "validate-resource",
        { id: "jitsi-meet:validate-meeting-share-resource" },
        async (stageCtx) => {
            const input = stageCtx.input ?? {};
            if (String(input.resourceType ?? "") !== "meeting") {
                return { valid: false, reason: "unsupported_resource_type" };
            }
            const dbExecutor = ctx.getCapability("db:executor");
            const profileStore = ctx.getCapability("social:profileStore");
            const log = ctx.getCapability("logging:log");
            if (!dbExecutor || !profileStore) {
                return { valid: false, reason: "dependencies_unavailable" };
            }
            const store = resolveStore(dbExecutor, log);
            await store.ensureSchema();
            const meeting = await store.getMeetingById(
                String(input.resourceId ?? ""),
            );
            if (!meeting) {
                return { valid: false, reason: "resource_not_found" };
            }
            const requesterAccess = await resolveMeetingRequesterAccess({
                store,
                profileStore,
                requesterAccountId: String(
                    input.claims?.sub ?? input.ownerAccountId ?? "",
                ),
                meeting,
            });
            if (!requesterAccess.isParticipant) {
                return { valid: false, reason: "forbidden" };
            }
            const state = await store.getMeetingState(meeting.id);
            return {
                valid: true,
                resourceType: "meeting",
                resourceId: meeting.id,
                ownerAccountId: String(
                    input.claims?.sub ?? input.ownerAccountId ?? "",
                ),
                meetingInstanceId: state.instanceId,
            };
        },
    );

    ctx.flow.extend(
        "mint-share-token",
        "authorize-minter",
        { id: "jitsi-meet:authorize-meeting-share-minter" },
        async (stageCtx) => {
            const resourceResult = getFirstStageResult(
                stageCtx.stageResults,
                "validate-resource",
            );
            if (!resourceResult?.valid) {
                return {
                    authorized: false,
                    reason: resourceResult?.reason ?? "invalid_resource",
                };
            }
            return {
                authorized: true,
                ownerAccountId: resourceResult.ownerAccountId,
                meetingInstanceId: resourceResult.meetingInstanceId,
            };
        },
    );

    ctx.flow.extend(
        "resolve-share-token",
        "resolve-resource",
        { id: "jitsi-meet:resolve-meeting-share-resource" },
        async (stageCtx) => {
            const tokenResult = getFirstStageResult(
                stageCtx.stageResults,
                "validate-token",
            );
            const tokenRecord = tokenResult?.tokenRecord ?? null;
            if (
                !tokenResult?.valid ||
                tokenRecord?.resourceType !== "meeting"
            ) {
                return { resolved: false, reason: "unsupported_resource_type" };
            }
            const dbExecutor = ctx.getCapability("db:executor");
            const profileStore = ctx.getCapability("social:profileStore");
            const log = ctx.getCapability("logging:log");
            if (!dbExecutor || !profileStore) {
                return { resolved: false, reason: "dependencies_unavailable" };
            }
            const store = resolveStore(dbExecutor, log);
            await store.ensureSchema();
            const meeting = await store.getMeetingById(
                String(tokenRecord.resourceId ?? ""),
            );
            if (!meeting) {
                return { resolved: false, reason: "resource_not_found" };
            }
            const state = await store.getMeetingState(meeting.id);
            const ownerProfile = await profileStore
                .getProfileByHandle(meeting.createdBy)
                .catch(() => null);
            return {
                resolved: true,
                resourceType: "meeting",
                resourceId: meeting.id,
                payload: {
                    meetingId: meeting.id,
                    chatRoomId: meeting.chatRoomId,
                    title: meeting.meetingName,
                    scheduledAt: meeting.createdAt,
                    duration: null,
                    hostDisplayName:
                        ownerProfile?.displayName ??
                        ownerProfile?.handle ??
                        meeting.createdBy,
                    joinUrl:
                        Array.isArray(tokenRecord.grantedCapabilities) &&
                        tokenRecord.grantedCapabilities.includes("meeting:join")
                            ? meeting.meetingUrl
                            : null,
                    endedAt: state.endedAt,
                    instanceId: state.instanceId,
                },
            };
        },
    );

    ctx.flow.extend(
        "resolve-share-token",
        "check-access",
        { id: "jitsi-meet:check-meeting-share-access" },
        async (stageCtx) => {
            const resourceResult = getFirstStageResult(
                stageCtx.stageResults,
                "resolve-resource",
            );
            if (!resourceResult?.resolved) {
                return {
                    allowed: false,
                    reason: resourceResult?.reason ?? "resource_not_found",
                };
            }
            const tokenResult = getFirstStageResult(
                stageCtx.stageResults,
                "validate-token",
            );
            const tokenMeetingInstanceId = String(
                tokenResult?.tokenRecord?.metadata?.meetingInstanceId ?? "",
            ).trim();
            const currentMeetingInstanceId = String(
                resourceResult.payload?.instanceId ?? "",
            ).trim();
            // Only reject as "expired" when both the token and the current
            // meeting have a concrete instance id that disagree — this means
            // the meeting was ended and restarted since the link was minted.
            // A share link minted before the meeting's first instance ever
            // started (a very common "share ahead of time" case) has an
            // empty tokenMeetingInstanceId and must not be rejected outright;
            // it should resolve normally once the meeting starts.
            if (
                tokenMeetingInstanceId &&
                currentMeetingInstanceId &&
                tokenMeetingInstanceId !== currentMeetingInstanceId
            ) {
                return { allowed: false, reason: "expired" };
            }
            if (resourceResult.payload?.endedAt) {
                return { allowed: false, reason: "expired" };
            }
            const requesterClaims = stageCtx.input?.requesterClaims;
            if (requesterClaims?.sub) {
                const hasDirectAccess = await requesterHasDirectMeetingAccess(
                    ctx,
                    requesterClaims,
                    resourceResult.resourceId,
                );
                if (hasDirectAccess) {
                    return { allowed: true, directAccess: true };
                }
            }
            return { allowed: true };
        },
    );

    if (ctx.flow.exists("construct-share-page")) {
        ctx.flow.extend(
            "construct-share-page",
            "resolve-resource-renderer",
            { id: "jitsi-meet:share-renderer" },
            (stageCtx) => {
                const input = stageCtx.input ?? {};
                if (String(input.resourceType ?? "") !== "meeting") {
                    return null;
                }
                return {
                    mountScriptUrl: "/static/modules/jitsi-meet/app.js",
                    stringsBaseUrl: ["/static/modules/jitsi-meet/languages"],
                    stylesheetUrls: [
                        "/static/styles/page-builder.css",
                        "/static/styles/reuse/page-sections.css",
                        ...resolveSharedMessagesStylesheetUrls(
                            resolveMessagesUiResources(ctx),
                        ),
                        "/static/modules/jitsi-meet/jitsi-meet.css",
                    ],
                };
            },
        );
    }

    if (ctx.flow.exists("revoke-share-token")) {
        ctx.flow.extend(
            "revoke-share-token",
            "authorize-revocation",
            { id: "jitsi-meet:authorize-share-revocation" },
            async (stageCtx) => {
                const input = stageCtx.input ?? {};
                if (String(input.resourceType ?? "") !== "meeting") {
                    return {
                        authorized: false,
                        reason: "unsupported_resource_type",
                    };
                }
                const dbExecutor = ctx.getCapability("db:executor");
                const profileStore = ctx.getCapability("social:profileStore");
                const log = ctx.getCapability("logging:log");
                if (!dbExecutor || !profileStore) {
                    return {
                        authorized: false,
                        reason: "dependencies_unavailable",
                    };
                }
                const store = resolveStore(dbExecutor, log);
                await store.ensureSchema();
                const meeting = await store.getMeetingById(
                    String(input.resourceId ?? ""),
                );
                if (!meeting) {
                    return { authorized: false, reason: "resource_not_found" };
                }
                const requesterAccess = await resolveMeetingRequesterAccess({
                    store,
                    profileStore,
                    requesterAccountId: String(
                        input.claims?.sub ?? input.ownerAccountId ?? "",
                    ),
                    meeting,
                });
                if (!requesterAccess.isParticipant) {
                    return { authorized: false, reason: "forbidden" };
                }
                return {
                    authorized: true,
                    shareId: String(input.shareId ?? ""),
                    resourceType: "meeting",
                    resourceId: meeting.id,
                };
            },
        );
    }
}
