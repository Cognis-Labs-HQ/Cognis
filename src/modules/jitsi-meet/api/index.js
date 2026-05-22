import path from "node:path";
import { JitsiMeetStore } from "./store.js";
import { registerMeetingRoutes } from "./meetings-routes.js";
import { hasMinRole, requireAuth } from "../../../gateways/shared.js";
import { readJson } from "../../../api/reuse/read-json.js";
import { checkHttpLiveness } from "../../../api/reuse/http-liveness.js";
import {
    normalizeHttpUrl,
    resolveExternalBaseUrl,
} from "../../../api/reuse/url-parts.js";
import { normalizeHandleKey } from "../../../gateways/social/bootstrap.js";
import { isModeratorRole, normalizeMeetingPrefix } from "./meeting-values.js";

const MODULE_ID = "jitsi-meet";
const PAGE_SCRIPT_ORIGIN_OWNER_ID = "module:jitsi-meet";
const MEETING_TITLE = "Cognis Classroom";
const LIVELINESS_TIMEOUT_MS = 5000;

const storeByExecutor = new WeakMap();

/**
 * Sends a JSON response with a fixed content-type header.
 *
 * @param {import("node:http").ServerResponse} res - HTTP response object.
 * @param {number} status - HTTP status code.
 * @param {unknown} payload - Serializable JSON payload.
 * @returns {void}
 */
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

async function resolveRequesterUsername(profileStore, accountId) {
    const profile = await profileStore.getProfile(accountId);
    const normalized = normalizeHandleKey(profile?.handle ?? "");
    if (!normalized) {
        throw new Error(
            "A visible profile handle is required to use Meetings.",
        );
    }
    return normalized;
}

async function resolveRequestedParticipants(
    profileStore,
    requestedHandles,
    { includeHidden = false } = {},
) {
    const usernames = [];
    for (const candidate of Array.isArray(requestedHandles)
        ? requestedHandles
        : []) {
        const normalizedHandle = normalizeHandleKey(candidate);
        if (!normalizedHandle) continue;
        const profile = await profileStore.getProfileByHandle(normalizedHandle);
        if (!profile?.handle) continue;
        if (!includeHidden && profile.visibility === "hidden") continue;
        usernames.push(normalizeHandleKey(profile.handle));
    }
    return usernames;
}

async function canAccessMeeting({
    store,
    meeting,
    username,
    listClassroomParticipantHandles,
}) {
    const directParticipants = await store.listParticipants(meeting.id);
    if (directParticipants.includes(username)) {
        return true;
    }
    if (!meeting.classroomId) {
        return false;
    }
    const classroomUsernames = await listClassroomParticipantHandles({
        classId: meeting.classroomId,
    });
    return classroomUsernames.includes(username);
}

async function resolveMeetingPayloadOrReject({
    body,
    profileStore,
    store,
    claims,
    res,
    listClassroomParticipantHandles,
}) {
    const requesterUsername = await resolveRequesterUsername(
        profileStore,
        claims.sub,
    );
    const meetingId = String(body.meetingId ?? "").trim();
    if (!meetingId) {
        sendError(res, 400, "bad_request", "meetingId is required.");
        return null;
    }
    const meeting = await store.getMeetingById(meetingId);
    if (!meeting) {
        sendError(res, 404, "not_found", "Meeting not found.");
        return null;
    }
    const authorized = await canAccessMeeting({
        store,
        meeting,
        username: requesterUsername,
        listClassroomParticipantHandles,
    });
    if (!authorized) {
        sendError(
            res,
            403,
            "forbidden",
            "You are not listed as an allowed meeting participant.",
        );
        return null;
    }
    const participants = await store.listParticipants(meeting.id);
    const state = await store.getMeetingState(meeting.id);
    return {
        meeting,
        participants,
        state,
        requesterUsername,
    };
}

async function createMeetingPayload({
    store,
    meeting,
    state,
    participants,
    requesterUsername,
    chatUrl,
    requiresReclaim,
}) {
    return store.buildMeetingPayload(meeting, participants, state, {
        chatUrl,
        requiresReclaim,
        canAuthenticate:
            store.canCurrentUserInitiateAuth(state, requesterUsername) === true,
        waitingForAuthentication:
            state.authRequired &&
            !state.authCompletedAt &&
            !store.canCurrentUserInitiateAuth(state, requesterUsername),
    });
}

function resolveStore(dbExecutor, log) {
    const existingStore = storeByExecutor.get(dbExecutor);
    if (existingStore) {
        return existingStore;
    }
    const nextStore = new JitsiMeetStore({
        db: dbExecutor,
        log,
    });
    storeByExecutor.set(dbExecutor, nextStore);
    return nextStore;
}

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

export function registerUi(ctx) {
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
    void registerStoredJitsiOrigin({ store, registerScriptOrigins, log });

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
        const normalizedRecipients = Array.from(
            new Set(
                (Array.isArray(recipientUsernames) ? recipientUsernames : [])
                    .map((username) => normalizeHandleKey(username))
                    .filter(Boolean)
                    .filter((username) => !excludedRecipients.has(username)),
            ),
        );
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

    router.get(
        "/api/v1/modules/jitsi-meet/ping",
        async (_req, res) => {
            await store.ensureSchema();
            const config = await store.getConfig();
            sendJson(res, 200, {
                data: {
                    ready: true,
                    configComplete: Boolean(config.instanceUrl),
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.get(
        "/api/v1/modules/jitsi-meet/config",
        async (_req, res) => {
            await store.ensureSchema();
            const config = await store.getConfig();
            sendJson(res, 200, { data: config });
        },
        { access: { minRole: "admin" }, allowWhenDisabled: true },
    );

    router.get(
        "/api/v1/modules/jitsi-meet/participants",
        async (req, res) => {
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const url = new URL(req.url, "http://localhost");
            const rawQuery = (url.searchParams.get("q") ?? "").trim();
            // Strip leading '@' and normalise case. The profile-store
            // searchProfiles() contract owns LIKE wildcard escaping for the
            // underlying DB dialect.
            const query = rawQuery.replace(/^@/, "").toLowerCase();
            const includeHidden = hasMinRole(claims.role, "admin");
            const candidates = await profileStore.searchProfiles(query, 50, {
                includeHidden,
            });
            const results = candidates
                .filter((profile) => profile.accountId !== claims.sub)
                .map((profile) => ({
                    handle: profile.handle,
                    displayName: profile.displayName ?? profile.handle,
                    avatarKey: profile.avatarKey ?? null,
                }));
            sendJson(res, 200, { data: results });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/config",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "admin");
            if (!claims) return;
            const body = await readJson(req);
            const instanceUrl = normalizeHttpUrl(body.instanceUrl);
            if (!instanceUrl) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "A valid http(s) Jitsi instance URL is required.",
                );
                return;
            }
            const meetingPrefix = normalizeMeetingPrefix(
                body.meetingPrefix ?? "",
            );
            const saved = await store.saveConfig({
                instanceUrl,
                meetingPrefix,
            });
            registerConfiguredJitsiOrigin(registerScriptOrigins, saved);
            log?.("info", "Jitsi Meet configuration updated.", {
                component: "jitsi-meet-module",
                operation: "save_config",
                hasInstanceUrl: Boolean(saved.instanceUrl),
                hasMeetingPrefix: Boolean(saved.meetingPrefix),
            });
            sendJson(res, 200, {
                data: saved,
            });
        },
        { access: { minRole: "admin" }, allowWhenDisabled: true },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/meetings/create",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;

            const body = await readJson(req);
            const requesterUsername = await resolveRequesterUsername(
                profileStore,
                claims.sub,
            ).catch((error) => {
                sendError(res, 409, "profile_required", error.message);
                return null;
            });
            if (!requesterUsername) return;

            const requestedParticipants = await resolveRequestedParticipants(
                profileStore,
                body.participants,
                { includeHidden: hasMinRole(claims.role, "admin") },
            );
            const normalizedInput = store.normalizeMeetingCreationInput({
                participants: requestedParticipants,
                classroomId: body.classroomId,
                creatorUsername: requesterUsername,
            });

            if (normalizedInput.participantUsernames.length < 2) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "At least two valid meeting participants are required.",
                );
                return;
            }

            const config = await store.getConfig();
            if (!config.instanceUrl) {
                sendError(
                    res,
                    409,
                    "config_required",
                    "The Jitsi instance URL must be configured before meetings can be created.",
                );
                return;
            }

            let chatRoom = null;
            if (typeof resolveGroupChat === "function") {
                const meetingChatTitle = buildMeetingChatTitle();
                chatRoom = await resolveGroupChat({
                    usernames: normalizedInput.participantUsernames,
                    title: meetingChatTitle,
                    createdByAccountId: claims.sub,
                }).catch(() => null);
            }

            const meeting = await store.createMeeting({
                instanceUrl: config.instanceUrl,
                meetingPrefix: config.meetingPrefix,
                usernames: normalizedInput.participantUsernames,
                classroomId: normalizedInput.classroomId,
                createdBy: requesterUsername,
                chatRoomId: chatRoom?.roomId ?? null,
            });

            const participants = await store.listParticipants(meeting.id);
            const state = await store.getMeetingState(meeting.id);
            const payload = await createMeetingPayload({
                store,
                meeting,
                state,
                participants,
                requesterUsername,
                chatUrl:
                    chatRoom?.url ??
                    (meeting.chatRoomId
                        ? `/messages/${encodeURIComponent(meeting.chatRoomId)}`
                        : null),
                requiresReclaim: false,
            });

            const addedParticipantUsernames = participants.filter(
                (username) => username !== requesterUsername,
            );
            await dispatchMeetingNotifications(addedParticipantUsernames, {
                subject: "Added to Meeting",
                body: `${requesterUsername} added you to a meeting.`,
                senderName: requesterUsername,
                metadata: {
                    event: "meeting_added",
                    meetingId: meeting.id,
                },
                meetingId: meeting.id,
                organizerUsername: meeting.createdBy,
            });

            sendJson(res, 200, {
                data: {
                    ...payload,
                    reused: Boolean(meeting.reused),
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/meetings/join",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const body = await readJson(req);

            const resolved = await resolveMeetingPayloadOrReject({
                body,
                profileStore,
                store,
                claims,
                res,
                listClassroomParticipantHandles,
            });
            if (!resolved) return;

            const sessionId = String(body.sessionId ?? "").trim();
            if (!sessionId) {
                sendError(res, 400, "bad_request", "sessionId is required.");
                return;
            }

            const conflictingSessions = await store.getActiveSessionsForUser(
                resolved.meeting.id,
                resolved.requesterUsername,
                sessionId,
            );
            const requiresReclaim =
                !resolved.state.endedAt && conflictingSessions.length > 0;

            await store.upsertPresence(
                resolved.meeting.id,
                resolved.requesterUsername,
                sessionId,
                !requiresReclaim,
            );

            let state = resolved.state;
            let meetingStarted = false;
            if (!state.firstJoinedBy || state.endedAt) {
                state = await store.updateMeetingState(resolved.meeting.id, {
                    firstJoinedBy: resolved.requesterUsername,
                    firstJoinedAt: new Date().toISOString(),
                    authRequired: false,
                    authStartedBy: null,
                    authStartedAt: null,
                    authCompletedAt: null,
                    endedBy: null,
                    endedAt: null,
                });
                meetingStarted = true;
            }

            const payload = await createMeetingPayload({
                store,
                meeting: resolved.meeting,
                state,
                participants: resolved.participants,
                requesterUsername: resolved.requesterUsername,
                chatUrl: resolved.meeting.chatRoomId
                    ? `/messages/${encodeURIComponent(resolved.meeting.chatRoomId)}`
                    : null,
                requiresReclaim,
            });

            if (meetingStarted) {
                await dispatchMeetingNotifications(resolved.participants, {
                    subject: "Meeting Started",
                    body: `${resolved.requesterUsername} started the meeting.`,
                    senderName: resolved.requesterUsername,
                    metadata: {
                        event: "meeting_started",
                        meetingId: resolved.meeting.id,
                    },
                    meetingId: resolved.meeting.id,
                    organizerUsername: resolved.meeting.createdBy,
                });
            }

            const moderatorUsernames = await resolveModeratorUsernames(
                resolved.meeting,
                resolved.participants,
            );
            await dispatchMeetingNotifications(
                moderatorUsernames.filter(
                    (username) => username !== resolved.requesterUsername,
                ),
                {
                    subject: "Participant Joined",
                    body: `${resolved.requesterUsername} joined the meeting.`,
                    senderName:
                        state.firstJoinedBy ?? resolved.requesterUsername,
                    metadata: {
                        event: "participant_joined",
                        meetingId: resolved.meeting.id,
                        participant: resolved.requesterUsername,
                    },
                    meetingId: resolved.meeting.id,
                    organizerUsername: resolved.meeting.createdBy,
                    excludeUsernames: [resolved.requesterUsername],
                },
            );

            sendJson(res, 200, {
                data: payload,
            });
        },
        { access: { minRole: "user" } },
    );

    registerMeetingRoutes({
        router,
        store,
        profileStore,
        listClassroomParticipantHandles,
        resolveMeetingPayloadOrReject,
        createMeetingPayload,
        resolveRequesterUsername,
        canAccessMeeting,
        requireAuth,
        readJson,
        sendJson,
        sendError,
        checkHttpLiveness,
        LIVELINESS_TIMEOUT_MS,
    });

    router.post(
        "/api/v1/modules/jitsi-meet/meetings/chat-room-summary",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const body = await readJson(req);
            const chatRoomId = String(body.chatRoomId ?? "").trim();
            if (!chatRoomId) {
                sendError(res, 400, "bad_request", "chatRoomId is required.");
                return;
            }

            const requesterUsername = await resolveRequesterUsername(
                profileStore,
                claims.sub,
            );
            const meeting = await store.getMeetingByChatRoomId(chatRoomId);
            if (!meeting) {
                sendError(res, 404, "not_found", "Meeting not found.");
                return;
            }
            const authorized = await canAccessMeeting({
                store,
                meeting,
                username: requesterUsername,
                listClassroomParticipantHandles,
            });
            if (!authorized) {
                sendError(
                    res,
                    403,
                    "forbidden",
                    "You are not listed as an allowed meeting participant.",
                );
                return;
            }

            const [participants, presence] = await Promise.all([
                store.listParticipants(meeting.id),
                store.listPresence(meeting.id),
            ]);
            const activeUsernames = Array.from(
                new Set(
                    presence
                        .filter((entry) => {
                            if (!entry.active) return false;
                            const seenAt = Date.parse(entry.lastSeenAt);
                            return Number.isFinite(seenAt)
                                ? seenAt >= Date.now() - 45_000
                                : false;
                        })
                        .map((entry) => entry.username),
                ),
            ).sort();
            const activeParticipants = await Promise.all(
                activeUsernames.map(async (username) => {
                    const profile =
                        await profileStore.getProfileByHandle(username);
                    return {
                        username,
                        handle: profile?.handle ?? username,
                        displayName:
                            profile?.displayName ?? profile?.handle ?? username,
                        avatarKey: profile?.avatarKey ?? null,
                    };
                }),
            );

            sendJson(res, 200, {
                data: {
                    meetingId: meeting.id,
                    meetingName: meeting.meetingName,
                    chatRoomId,
                    createdAt: meeting.createdAt,
                    participantCount: participants.length,
                    presentCount: activeParticipants.length,
                    activeParticipants,
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/meetings/presence",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const body = await readJson(req);

            const resolved = await resolveMeetingPayloadOrReject({
                body,
                profileStore,
                store,
                claims,
                res,
                listClassroomParticipantHandles,
            });
            if (!resolved) return;

            const sessionId = String(body.sessionId ?? "").trim();
            if (!sessionId) {
                sendError(res, 400, "bad_request", "sessionId is required.");
                return;
            }

            const previousPresenceEntries = await store.listPresence(
                resolved.meeting.id,
            );
            const previousSessionPresence = previousPresenceEntries.find(
                (entry) =>
                    entry.username === resolved.requesterUsername &&
                    entry.sessionId === sessionId,
            );
            const nextPresenceActive = body.active !== false;
            const meetingTerminated = body.terminated === true;

            await store.upsertPresence(
                resolved.meeting.id,
                resolved.requesterUsername,
                sessionId,
                nextPresenceActive,
            );

            if (previousSessionPresence?.active && !nextPresenceActive) {
                await store.setUserSessionsInactive(
                    resolved.meeting.id,
                    resolved.requesterUsername,
                );
                const moderatorUsernames = await resolveModeratorUsernames(
                    resolved.meeting,
                    resolved.participants,
                );
                await dispatchMeetingNotifications(moderatorUsernames, {
                    subject: "Participant Left",
                    body: `${resolved.requesterUsername} left the meeting.`,
                    senderName:
                        resolved.state.firstJoinedBy ??
                        resolved.meeting.createdBy ??
                        resolved.requesterUsername,
                    metadata: {
                        event: "participant_left",
                        meetingId: resolved.meeting.id,
                        participant: resolved.requesterUsername,
                    },
                    meetingId: resolved.meeting.id,
                    organizerUsername: resolved.meeting.createdBy,
                    excludeUsernames: [resolved.requesterUsername],
                });

                const updatedPresenceEntries = await store.listPresence(
                    resolved.meeting.id,
                );
                const activeParticipantUsernames = new Set(
                    store
                        .filterCurrentPresenceEntries(updatedPresenceEntries)
                        .map((entry) => entry.username),
                );
                const shouldCloseMeeting =
                    meetingTerminated || activeParticipantUsernames.size === 0;
                if (shouldCloseMeeting && !resolved.state.endedAt) {
                    await store.updateMeetingState(resolved.meeting.id, {
                        authRequired: false,
                        authStartedBy: null,
                        authStartedAt: null,
                        authCompletedAt: null,
                        firstJoinedBy: null,
                        firstJoinedAt: null,
                        endedBy: resolved.requesterUsername,
                        endedAt: new Date().toISOString(),
                    });
                    await dispatchMeetingNotifications(resolved.participants, {
                        subject: "Meeting Ended",
                        body: meetingTerminated
                            ? "The Jitsi conference was terminated."
                            : `${resolved.requesterUsername} ended the meeting.`,
                        senderName:
                            resolved.state.firstJoinedBy ??
                            resolved.meeting.createdBy ??
                            resolved.requesterUsername,
                        metadata: {
                            event: "meeting_ended",
                            meetingId: resolved.meeting.id,
                        },
                        meetingId: resolved.meeting.id,
                        organizerUsername: resolved.meeting.createdBy,
                    });
                }
            }

            sendJson(res, 200, {
                data: {
                    ok: true,
                    meetingClosed:
                        previousSessionPresence?.active && !nextPresenceActive
                            ? (await store.getMeetingState(resolved.meeting.id))
                                  .endedAt !== null
                            : false,
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.get(
        "/api/v1/modules/jitsi-meet/admin/meetings",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "admin");
            if (!claims) return;
            const meetings = await store.listActiveMeetings();
            sendJson(res, 200, {
                data: meetings,
            });
        },
        { access: { minRole: "admin" } },
    );
}
