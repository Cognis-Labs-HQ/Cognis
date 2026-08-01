import path from "node:path";
import { registerMeetingRoutes } from "./meetings-routes.js";
import { registerMeetingConfigRoutes } from "./config-routes.js";
import { registerMeetingParticipantRoutes } from "./participant-routes.js";
import { registerMeetingLifecycleRoutes } from "./meeting-lifecycle-routes.js";
import { registerAdminMeetingRoutes } from "./admin-meetings-routes.js";
import { hasMinRole, requireAuth } from "../../../gateways/shared.js";
import { readJson } from "../../../api/reuse/read-json.js";
import { checkHttpLiveness } from "../../../api/reuse/http-liveness.js";
import {
    normalizeHttpUrl,
    resolveExternalBaseUrl,
} from "../../../api/reuse/url-parts.js";
import { normalizeHandleKey } from "../../../api/reuse/normalize-handle.js";
import { isModeratorRole, normalizeMeetingPrefix } from "./meeting-values.js";
import {
    registerJitsiUiResourcesRoute,
    resolveMessagesUiResources,
    resolveSharedMessagesStylesheetUrls,
} from "./ui-resources.js";
import { registerMeetingShareRoutes } from "./share-routes.js";
import { resolveStore } from "./reuse/store-runtime.js";
import { resolveRequesterUsername } from "./reuse/requester.js";
import {
    canAccessMeeting,
    createMeetingPayload,
    filterUsernamesForGuestVisibility,
    resolveMeetingPayloadOrReject,
    resolveRequestedParticipants,
    resolveShareGuestMeetingAccess,
    resolveShareGuestPresenceUsername,
} from "./reuse/meeting-access.js";

const PAGE_SCRIPT_ORIGIN_OWNER_ID = "module:jitsi-meet";
const MEETING_TITLE = "Cognis Classroom";
const LIVELINESS_TIMEOUT_MS = 5000;

function registerConfiguredJitsiOrigin(registerScriptOrigins, config) {
    if (typeof registerScriptOrigins !== "function") {
        return;
    }
    registerScriptOrigins(PAGE_SCRIPT_ORIGIN_OWNER_ID, [config?.instanceUrl]);
}

async function registerStoredJitsiOrigin({
    store,
    registerScriptOrigins,
    log,
}) {
    try {
        await store.ensureSchema();
        registerConfiguredJitsiOrigin(
            registerScriptOrigins,
            await store.getConfig(),
        );
    } catch (error) {
        log?.("error", "Failed to register stored Jitsi CSP origin.", {
            component: "jitsi-meet-module",
            operation: "register_stored_jitsi_origin",
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

function sendJson(res, status, payload) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}

function sendError(res, status, code, message) {
    sendJson(res, status, {
        error: {
            code,
            message,
        },
    });
}

function buildMeetingChatTitle(createdAt = null) {
    const parsedCreatedAt =
        typeof createdAt === "string" ? Date.parse(createdAt) : Number.NaN;
    const isoDate = Number.isFinite(parsedCreatedAt)
        ? new Date(parsedCreatedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    return `${MEETING_TITLE} — ${isoDate}`;
}

function buildMeetingActionUrl(meetingId) {
    const normalizedMeetingId = String(meetingId ?? "").trim();
    if (!normalizedMeetingId) {
        return "/meetings";
    }
    return `/meetings?meetingId=${encodeURIComponent(normalizedMeetingId)}`;
}

function buildMeetingEmailLink(meetingId) {
    const actionUrl = buildMeetingActionUrl(meetingId);
    const externalHost = resolveExternalBaseUrl();
    return externalHost ? `${externalHost}${actionUrl}` : actionUrl;
}

function appendMeetingLinkToBody(body, meetingId) {
    const meetingLink = buildMeetingEmailLink(meetingId);
    if (!meetingLink) return body;
    return `${body}\n\nMeeting link: ${meetingLink}`;
}

export function registerUi(ctx) {
    const messagesUiResources = resolveMessagesUiResources(ctx);
    const sharedStylesheetUrls =
        resolveSharedMessagesStylesheetUrls(messagesUiResources);
    const moduleUiRoot = path.join(ctx.moduleRoot, "ui");
    ctx.registerStaticDir("", moduleUiRoot);
    ctx.registerNavbarPlugin({
        scriptUrl: "/static/modules/jitsi-meet/navbar.js",
    });
    ctx.registerSpaRoute({
        id: "module-jitsi-meet-meetings",
        pattern: "^/meetings$",
        base: "/meetings",
        scriptUrl: "/static/modules/jitsi-meet/app.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            ...sharedStylesheetUrls,
            "/static/modules/jitsi-meet/jitsi-meet.css",
        ],
        access: { minRole: "user" },
    });
    ctx.registerAdminSection({
        id: "module-jitsi-meet-meetings",
        label: "Meetings",
        scriptUrl: "/static/modules/jitsi-meet/admin-meetings-section.js",
        access: { minRole: "admin" },
        stringsBaseUrl: "/static/modules/jitsi-meet/languages",
    });
}

export function registerApiRoutes(router, ctx) {
    const dbExecutor = ctx.getCapability("db:executor");
    const systemCtx = ctx.getCapability("system:ctx");
    const profileStore = ctx.getCapability("social:profileStore");
    const messagesUiResources = resolveMessagesUiResources(ctx);
    const resolveGroupChat = ctx.getCapability(
        "social:messages:resolveGroupChatUrl",
    );
    const listClassroomParticipantHandles =
        ctx.getCapability("study:classroom:listParticipantHandles") ??
        (async () => []);
    const dispatchNotification = ctx.getCapability("notify:dispatch");
    const registerNotificationCategory = ctx.getCapability(
        "notify:registerCategory",
    );
    const accountStore = ctx.getCapability("auth:accountStore");
    const listCalendarsByOwner = ctx.getCapability("calendar:listCalendars");
    const listCalendarEvents = ctx.getCapability("calendar:listEvents");
    const getShareTokenById = ctx.getCapability("share:getTokenById");
    const resolveMeetingPayload = (input) =>
        resolveMeetingPayloadOrReject({
            ...input,
            sendError,
        });

    if (typeof registerNotificationCategory === "function") {
        registerNotificationCategory("meetings", "Meetings");
    }

    if (!dbExecutor || !profileStore) {
        const unavailablePayload = (res) =>
            sendError(
                res,
                503,
                "service_unavailable",
                "Jitsi Meet dependencies are unavailable.",
            );
        router.get("/api/v1/modules/jitsi-meet/config", async (_req, res) => {
            unavailablePayload(res);
        });
        router.get(
            "/api/v1/modules/jitsi-meet/admin/meetings",
            async (_req, res) => {
                unavailablePayload(res);
            },
        );
        router.get(
            "/api/v1/modules/jitsi-meet/admin/meetings/upcoming",
            async (_req, res) => {
                unavailablePayload(res);
            },
        );
        router.get(
            "/api/v1/modules/jitsi-meet/participants",
            async (_req, res) => {
                sendJson(res, 200, { data: [] });
            },
        );
        router.get(
            "/api/v1/modules/jitsi-meet/meetings/active",
            async (_req, res) => {
                sendJson(res, 200, { data: [] });
            },
        );
        router.get("/api/v1/modules/jitsi-meet/ping", async (_req, res) => {
            sendJson(res, 200, {
                data: {
                    ready: false,
                    reason: "required_capabilities_missing",
                },
            });
        });
        registerJitsiUiResourcesRoute({
            requireAuth,
            router,
            sendJson,
            unavailable: true,
        });
        for (const routePath of [
            "/api/v1/modules/jitsi-meet/config",
            "/api/v1/modules/jitsi-meet/meetings/create",
            "/api/v1/modules/jitsi-meet/meetings/get",
            "/api/v1/modules/jitsi-meet/meetings/preflight",
            "/api/v1/modules/jitsi-meet/meetings/probe",
            "/api/v1/modules/jitsi-meet/meetings/join",
            "/api/v1/modules/jitsi-meet/meetings/reclaim",
            "/api/v1/modules/jitsi-meet/meetings/presence",
            "/api/v1/modules/jitsi-meet/meetings/auth-required",
            "/api/v1/modules/jitsi-meet/meetings/auth-start",
            "/api/v1/modules/jitsi-meet/meetings/auth-complete",
            "/api/v1/modules/jitsi-meet/meetings/state",
        ]) {
            router.post(routePath, async (_req, res) => {
                unavailablePayload(res);
            });
        }
        return;
    }

    const removeMeetingMemberships = async (accountId) => {
        await dbExecutor.transaction(async (transactionDb) => {
            for (const table of [
                "jitsi_meeting_presence",
                "jitsi_meeting_participants",
            ]) {
                await transactionDb.executeCommand({
                    option: "DELETE",
                    table,
                    where: [{ column: "username", value: accountId }],
                });
            }
        });
    };
    systemCtx?.getCapability?.("auth:registerKeyringDataOwner")?.(
        "jitsi-meet",
        removeMeetingMemberships,
    );

    systemCtx?.flow?.extend?.(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "jitsi-meet:delete-user-activity" },
        async (stageCtx) => {
            const input = stageCtx.input ?? {};
            const persistResult = stageCtx.stageResults["persist-state"] ?? [];
            if (
                input.action !== "delete" ||
                !input.username ||
                !persistResult[0]?.persisted
            ) {
                return { cleaned: false };
            }
            const accountId = normalizeHandleKey(input.username);
            await dbExecutor.transaction(async (transactionDb) => {
                for (const table of [
                    "jitsi_meeting_presence",
                    "jitsi_meeting_participants",
                ]) {
                    await transactionDb.executeCommand({
                        option: "DELETE",
                        table,
                        where: [{ column: "username", value: accountId }],
                    });
                }
                const meetingResult = await transactionDb.executeCommand({
                    option: "SELECT",
                    table: "jitsi_meetings",
                    columns: ["id"],
                    where: [{ column: "created_by", value: accountId }],
                });
                for (const meetingRow of meetingResult.rows ?? []) {
                    const meetingId = String(meetingRow.id);
                    for (const table of [
                        "jitsi_meeting_presence",
                        "jitsi_meeting_participants",
                        "jitsi_meeting_state",
                    ]) {
                        await transactionDb.executeCommand({
                            option: "DELETE",
                            table,
                            where: [{ column: "meeting_id", value: meetingId }],
                        });
                    }
                }
                await transactionDb.executeCommand({
                    option: "DELETE",
                    table: "jitsi_meetings",
                    where: [{ column: "created_by", value: accountId }],
                });
            });
            ctx.log?.("info", "Deleted user meeting activity.", {
                component: "jitsi-meet-module",
                operation: "delete_user_activity",
                accountId,
            });
            return { cleaned: true, accountId };
        },
    );

    const log = ctx.getCapability("logging:log");
    const registerScriptOrigins = ctx.getCapability(
        "auth:registerPageScriptOrigins",
    );
    const store = resolveStore(dbExecutor, log);
    const runEnableTest = async () => {
        await store.ensureSchema();
        const config = await store.getConfig();
        if (!config.instanceUrl) {
            return {
                ok: false,
                code: "config_required",
                message:
                    "The Jitsi instance URL must be configured before the module can be enabled.",
            };
        }
        const liveness = await checkHttpLiveness(config.instanceUrl, {
            timeoutMs: LIVELINESS_TIMEOUT_MS,
        });
        return {
            ok: Boolean(liveness.alive),
            code: liveness.alive ? "ok" : "liveness_failed",
            message: liveness.alive
                ? "Jitsi Meet enablement test passed."
                : "The configured Jitsi instance did not respond successfully.",
            data: { ...liveness, instanceUrl: config.instanceUrl },
        };
    };
    ctx.getCapability("system:ctx")?.contributePublicCapability?.(
        "module:jitsi-meet:enableTest",
        runEnableTest,
    );
    const contributeHealth = ctx.getCapability("system:health:contribute");
    if (typeof contributeHealth === "function") {
        contributeHealth("module:jitsi-meet", async () => {
            const result = await runEnableTest();
            return {
                componentId: "jitsi-meet",
                componentType: "module",
                status: result.ok ? "ok" : "warning",
                message: result.message,
                checkedAt: new Date().toISOString(),
                data: result.data,
            };
        });
    }
    router.post(
        "/api/v1/modules/jitsi-meet/admin/enable-test",
        async (_req, res) => {
            const result = await runEnableTest();
            if (!result.ok) {
                sendError(res, 409, result.code, result.message);
                return;
            }
            sendJson(res, 200, { data: result.data });
        },
        { access: { minRole: "admin" }, allowWhenDisabled: true },
    );
    ctx.capabilities?.contribute?.(
        "jitsi-meet:getMeetingById",
        store.getMeetingById.bind(store),
    );
    void registerStoredJitsiOrigin({ store, registerScriptOrigins, log });

    registerJitsiUiResourcesRoute({
        requireAuth,
        router,
        sendJson,
        messagesUiResources,
    });

    registerMeetingShareRoutes({
        router,
        ctx,
        requireAuth,
        profileStore,
    });

    async function dispatchMeetingNotifications(
        recipientUsernames,
        {
            subject,
            body,
            metadata = {},
            senderName,
            meetingId = null,
            organizerUsername = "",
            excludeUsernames = [],
        },
    ) {
        if (typeof dispatchNotification !== "function") return;
        const notificationMeetingId = meetingId ?? metadata?.meetingId;
        const excludedRecipients = new Set(
            [organizerUsername, ...excludeUsernames]
                .map((username) => normalizeHandleKey(username))
                .filter(Boolean),
        );
        const candidateRecipients = [];
        const seenRecipients = new Set();
        for (const candidate of Array.isArray(recipientUsernames)
            ? recipientUsernames
            : []) {
            const normalizedCandidate = normalizeHandleKey(candidate);
            if (
                !normalizedCandidate ||
                excludedRecipients.has(normalizedCandidate) ||
                seenRecipients.has(normalizedCandidate)
            ) {
                continue;
            }
            seenRecipients.add(normalizedCandidate);
            candidateRecipients.push(String(candidate).trim());
        }
        const organizerProfile = organizerUsername
            ? await profileStore
                  .getProfileByHandle(organizerUsername)
                  .catch(() => null)
            : null;
        const normalizedRecipients = [];
        for (const recipientUsername of candidateRecipients) {
            let recipientProfile = await profileStore
                .getProfileByHandle(recipientUsername)
                .catch(() => null);
            if (!recipientProfile?.accountId) {
                recipientProfile = await profileStore
                    .getProfile(recipientUsername)
                    .catch(() => null);
            }
            if (!recipientProfile?.accountId) {
                log?.(
                    "error",
                    "Failed to resolve meeting notification recipient.",
                    {
                        component: "jitsi-meet-module",
                        operation: "resolve_meeting_notification_recipient",
                        recipientUsername,
                    },
                );
                continue;
            }
            if (organizerProfile?.accountId) {
                if (
                    await profileStore.isBlocked(
                        organizerProfile.accountId,
                        recipientProfile.accountId,
                    )
                ) {
                    continue;
                }
            }
            normalizedRecipients.push({
                accountId: recipientProfile.accountId,
                username:
                    normalizeHandleKey(recipientProfile.handle) ||
                    recipientUsername,
            });
        }
        const bodyWithMeetingLink = appendMeetingLinkToBody(
            body,
            notificationMeetingId,
        );
        for (const recipient of normalizedRecipients) {
            try {
                await dispatchNotification({
                    category: "meetings",
                    recipientUsername: recipient.accountId,
                    subject,
                    body: bodyWithMeetingLink,
                    senderName,
                    actionUrl: buildMeetingActionUrl(notificationMeetingId),
                    metadata,
                });
            } catch (error) {
                log?.("error", "Failed to dispatch meeting notification.", {
                    component: "jitsi-meet-module",
                    operation: "dispatch_meeting_notification",
                    recipientUsername: recipient.username,
                    recipientAccountId: recipient.accountId,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    async function resolveModeratorUsernames(meeting, participantUsernames) {
        const normalizedParticipants = Array.from(
            new Set(
                (Array.isArray(participantUsernames)
                    ? participantUsernames
                    : []
                )
                    .map((username) => normalizeHandleKey(username))
                    .filter(Boolean),
            ),
        );
        const moderatorSet = new Set([
            normalizeHandleKey(meeting?.createdBy ?? ""),
        ]);
        if (
            !accountStore ||
            typeof accountStore.list !== "function" ||
            normalizedParticipants.length === 0
        ) {
            return Array.from(moderatorSet).filter(Boolean);
        }
        const users = await accountStore.list().catch(() => []);
        for (const user of users) {
            const username = normalizeHandleKey(user?.username);
            if (!username || !normalizedParticipants.includes(username)) {
                continue;
            }
            if (isModeratorRole(user?.role) || user?.isFounder === true) {
                moderatorSet.add(username);
            }
        }
        return Array.from(moderatorSet).filter(Boolean);
    }

    const routeContext = {
        router,
        store,
        profileStore,
        requireAuth,
        readJson,
        sendJson,
        sendError,
        hasMinRole,
        normalizeHttpUrl,
        normalizeMeetingPrefix,
        registerConfiguredJitsiOrigin,
        registerScriptOrigins,
        log,
        resolveRequesterUsername,
        resolveRequestedParticipants,
        createMeetingPayload,
        resolveMeetingPayload,
        resolveShareGuestMeetingAccess: (input) =>
            resolveShareGuestMeetingAccess({
                ...input,
                getShareTokenById,
            }),
        resolveShareGuestPresenceUsername,
        listClassroomParticipantHandles,
        canAccessMeeting,
        resolveGroupChat,
        buildMeetingChatTitle,
        dispatchMeetingNotifications,
        resolveModeratorUsernames,
    };

    registerMeetingConfigRoutes(routeContext);
    registerMeetingParticipantRoutes(routeContext);
    registerMeetingLifecycleRoutes(routeContext);

    registerMeetingRoutes({
        router,
        store,
        profileStore,
        listCalendarsByOwner,
        listCalendarEvents,
        listClassroomParticipantHandles,
        resolveMeetingPayloadOrReject: resolveMeetingPayload,
        createMeetingPayload,
        resolveRequesterUsername,
        canAccessMeeting,
        filterUsernamesForGuestVisibility: (usernames) =>
            filterUsernamesForGuestVisibility(profileStore, usernames),
        requireAuth,
        readJson,
        sendJson,
        sendError,
        checkHttpLiveness,
        LIVELINESS_TIMEOUT_MS,
        resolveShareGuestMeetingAccess: (input) =>
            resolveShareGuestMeetingAccess({
                ...input,
                getShareTokenById,
            }),
    });

    registerAdminMeetingRoutes({
        router,
        store,
        requireAuth,
        sendJson,
        profileStore,
    });
}
