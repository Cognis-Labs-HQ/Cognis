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
        const candidateRecipients = Array.from(
            new Set(
                (Array.isArray(recipientUsernames) ? recipientUsernames : [])
                    .map((username) => normalizeHandleKey(username))
                    .filter(Boolean)
                    .filter((username) => !excludedRecipients.has(username)),
            ),
        );
        const organizerProfile = organizerUsername
            ? await profileStore
                  .getProfileByHandle(organizerUsername)
                  .catch(() => null)
            : null;
        const normalizedRecipients = [];
        for (const recipientUsername of candidateRecipients) {
            if (organizerProfile?.accountId) {
                const recipientProfile = await profileStore
                    .getProfileByHandle(recipientUsername)
                    .catch(() => null);
                if (
                    recipientProfile?.accountId &&
                    (await profileStore.isBlocked(
                        organizerProfile.accountId,
                        recipientProfile.accountId,
                    ))
                ) {
                    continue;
                }
            }
            normalizedRecipients.push(recipientUsername);
        }
        const bodyWithMeetingLink = appendMeetingLinkToBody(
            body,
            notificationMeetingId,
        );
        for (const recipientUsername of normalizedRecipients) {
            try {
                await dispatchNotification({
                    category: "meetings",
                    recipientUsername,
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
                    recipientUsername,
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

    registerAdminMeetingRoutes({ router, store, requireAuth, sendJson });
}
