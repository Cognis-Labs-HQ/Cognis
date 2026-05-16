import path from "node:path";
import { JitsiMeetStore } from "./store.js";
import { requireAuth } from "../../../gateways/auth/guard.js";
import { readJson } from "../../../api/reuse/read-json.js";

const MODULE_ID = "jitsi-meet";
const MEETING_TITLE = "Cognis Classroom";
const LIVELINESS_TIMEOUT_MS = 5000;

const storeByExecutor = new WeakMap();

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

function normalizeUsername(value) {
    return String(value ?? "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
}

async function resolveRequesterUsername(profileStore, accountId) {
    const profile = await profileStore.getProfile(accountId);
    const normalized = normalizeUsername(profile?.handle ?? "");
    if (!normalized) {
        throw new Error(
            "A visible profile handle is required to use Meetings.",
        );
    }
    return normalized;
}

async function resolveRequestedParticipants(profileStore, requestedHandles) {
    const usernames = [];
    for (const candidate of Array.isArray(requestedHandles)
        ? requestedHandles
        : []) {
        const normalizedHandle = normalizeUsername(candidate);
        if (!normalizedHandle) continue;
        const profile = await profileStore.getProfileByHandle(normalizedHandle);
        if (!profile?.handle) continue;
        usernames.push(normalizeUsername(profile.handle));
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

async function checkMeetingLiveness(meetingUrl) {
    const abortController = new AbortController();
    const timer = setTimeout(() => {
        abortController.abort();
    }, LIVELINESS_TIMEOUT_MS);
    try {
        const response = await fetch(meetingUrl, {
            method: "GET",
            signal: abortController.signal,
            redirect: "follow",
        });
        return {
            alive: response.ok,
            status: response.status,
        };
    } catch (error) {
        return {
            alive: false,
            error: error instanceof Error ? error.message : String(error),
        };
    } finally {
        clearTimeout(timer);
    }
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

    const store = resolveStore(dbExecutor, ctx.getCapability("logging:log"));

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

    router.post(
        "/api/v1/modules/jitsi-meet/config",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "admin");
            if (!claims) return;
            const body = await readJson(req);
            const instanceUrl = store.normalizeInstanceUrl(body.instanceUrl);
            if (!instanceUrl) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "A valid http(s) Jitsi instance URL is required.",
                );
                return;
            }
            const meetingPrefix = store.normalizeMeetingPrefix(
                body.meetingPrefix ?? "",
            );
            const saved = await store.saveConfig({
                instanceUrl,
                meetingPrefix,
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
                chatRoom = await resolveGroupChat({
                    usernames: normalizedInput.participantUsernames,
                    title: MEETING_TITLE,
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
        "/api/v1/modules/jitsi-meet/meetings/get",
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

            const payload = await createMeetingPayload({
                store,
                meeting: resolved.meeting,
                state: resolved.state,
                participants: resolved.participants,
                requesterUsername: resolved.requesterUsername,
                chatUrl: resolved.meeting.chatRoomId
                    ? `/messages/${encodeURIComponent(resolved.meeting.chatRoomId)}`
                    : null,
                requiresReclaim: false,
            });
            sendJson(res, 200, {
                data: payload,
            });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/meetings/probe",
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

            const liveness = await checkMeetingLiveness(
                resolved.meeting.meetingUrl,
            );
            sendJson(res, 200, {
                data: liveness,
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
            const requiresReclaim = conflictingSessions.length > 0;

            await store.upsertPresence(
                resolved.meeting.id,
                resolved.requesterUsername,
                sessionId,
                !requiresReclaim,
            );

            let state = resolved.state;
            if (!state.firstJoinedBy) {
                state = await store.updateMeetingState(resolved.meeting.id, {
                    firstJoinedBy: resolved.requesterUsername,
                    firstJoinedAt: new Date().toISOString(),
                });
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

            sendJson(res, 200, {
                data: payload,
            });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/meetings/reclaim",
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

            await store.setOtherSessionsInactive(
                resolved.meeting.id,
                resolved.requesterUsername,
                sessionId,
            );
            await store.upsertPresence(
                resolved.meeting.id,
                resolved.requesterUsername,
                sessionId,
                true,
            );

            sendJson(res, 200, {
                data: {
                    reclaimed: true,
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

            await store.upsertPresence(
                resolved.meeting.id,
                resolved.requesterUsername,
                sessionId,
                body.active !== false,
            );

            sendJson(res, 200, {
                data: {
                    ok: true,
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/meetings/auth-required",
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

            const state = await store.updateMeetingState(resolved.meeting.id, {
                authRequired: true,
                authCompletedAt: null,
            });

            sendJson(res, 200, {
                data: {
                    authRequired: state.authRequired,
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/meetings/auth-start",
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

            const canAuthenticate = store.canCurrentUserInitiateAuth(
                resolved.state,
                resolved.requesterUsername,
            );
            if (!canAuthenticate) {
                sendError(
                    res,
                    409,
                    "auth_locked",
                    "Another participant currently has priority to complete authentication.",
                );
                return;
            }

            const state = await store.updateMeetingState(resolved.meeting.id, {
                authRequired: true,
                authStartedBy: resolved.requesterUsername,
                authStartedAt: new Date().toISOString(),
                authCompletedAt: null,
            });

            sendJson(res, 200, {
                data: {
                    authRequired: state.authRequired,
                    authStartedBy: state.authStartedBy,
                    authStartedAt: state.authStartedAt,
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/meetings/auth-complete",
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

            const state = await store.updateMeetingState(resolved.meeting.id, {
                authRequired: false,
                authCompletedAt: new Date().toISOString(),
                authStartedBy: resolved.requesterUsername,
            });

            sendJson(res, 200, {
                data: {
                    authRequired: state.authRequired,
                    authCompletedAt: state.authCompletedAt,
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.post(
        "/api/v1/modules/jitsi-meet/meetings/state",
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

            const presence = await store.listPresence(resolved.meeting.id);
            sendJson(res, 200, {
                data: {
                    state: resolved.state,
                    activeParticipants: presence
                        .filter((entry) => entry.active)
                        .map((entry) => entry.username),
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
