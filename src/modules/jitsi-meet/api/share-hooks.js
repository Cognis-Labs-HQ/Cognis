import { resolveStore } from "./reuse/store-runtime.js";
import { resolveRequesterUsername } from "./reuse/requester.js";
import { getFirstStageResult } from "../../../api/reuse/flow-helpers.js";
import {
    resolveMessagesUiResources,
    resolveSharedMessagesStylesheetUrls,
} from "./ui-resources.js";

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
                const requesterAccountId = String(
                    input.requesterAccountId ?? "",
                );
                const profiles = await Promise.all(
                    usernames.map((username) =>
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
            const requesterUsername = await resolveRequesterUsername(
                profileStore,
                String(input.claims?.sub ?? input.ownerAccountId ?? ""),
            ).catch(() => "");
            if (!requesterUsername || requesterUsername !== meeting.createdBy) {
                return { valid: false, reason: "forbidden" };
            }
            return {
                valid: true,
                resourceType: "meeting",
                resourceId: meeting.id,
                ownerAccountId: String(
                    input.claims?.sub ?? input.ownerAccountId ?? "",
                ),
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
            if (resourceResult.payload?.endedAt) {
                return { allowed: false, reason: "expired" };
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
                const requesterUsername = await resolveRequesterUsername(
                    profileStore,
                    String(input.claims?.sub ?? input.ownerAccountId ?? ""),
                ).catch(() => "");
                if (
                    !requesterUsername ||
                    requesterUsername !== meeting.createdBy
                ) {
                    return { authorized: false, reason: "forbidden" };
                }
                return {
                    authorized: true,
                    shareId: String(input.shareId ?? ""),
                    ownerAccountId: String(
                        input.claims?.sub ?? input.ownerAccountId ?? "",
                    ),
                    resourceType: "meeting",
                    resourceId: meeting.id,
                };
            },
        );
    }
}
