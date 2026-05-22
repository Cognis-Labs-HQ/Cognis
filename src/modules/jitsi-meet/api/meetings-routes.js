export function registerMeetingRoutes({
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
}) {
    router.get(
        "/api/v1/modules/jitsi-meet/meetings/active",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const requesterUsername = await resolveRequesterUsername(
                profileStore,
                claims.sub,
            );
            const activeMeetings = await store.listActiveMeetings();
            const visibleMeetings = [];
            for (const activeMeeting of activeMeetings) {
                const meeting = await store.getMeetingById(activeMeeting.id);
                if (!meeting) continue;
                const authorized = await canAccessMeeting({
                    store,
                    meeting,
                    username: requesterUsername,
                    listClassroomParticipantHandles,
                });
                if (!authorized) continue;
                const [participants, state] = await Promise.all([
                    store.listParticipants(meeting.id),
                    store.getMeetingState(meeting.id),
                ]);
                if (state.endedAt) continue;
                if (state.authRequired && !state.authCompletedAt) continue;
                const startedByUsername = state.firstJoinedBy ?? meeting.createdBy ?? "";
                const startedByProfile = startedByUsername
                    ? await profileStore
                          .getProfileByHandle(startedByUsername)
                          .catch(() => null)
                    : null;
                const activeParticipants = await Promise.all(
                    (Array.isArray(activeMeeting.activeUsernames)
                        ? activeMeeting.activeUsernames
                        : []
                    ).map(async (username) => {
                        const profile = await profileStore
                            .getProfileByHandle(username)
                            .catch(() => null);
                        return {
                            username,
                            handle: profile?.handle ?? username,
                            displayName:
                                profile?.displayName ??
                                profile?.handle ??
                                username,
                            avatarKey: profile?.avatarKey ?? null,
                        };
                    }),
                );
                visibleMeetings.push({
                    id: meeting.id,
                    meetingName: meeting.meetingName,
                    meetingUrl: meeting.meetingUrl,
                    roomSlug: activeMeeting.roomSlug ?? null,
                    chatRoomId: meeting.chatRoomId,
                    createdAt: meeting.createdAt,
                    participantCount: participants.length,
                    activeSessionCount: Number(activeMeeting.activeSessionCount),
                    state: {
                        authRequired: state.authRequired,
                        authCompletedAt: state.authCompletedAt,
                        firstJoinedBy: state.firstJoinedBy,
                        firstJoinedAt: state.firstJoinedAt,
                    },
                    startedBy: {
                        username: startedByUsername,
                        displayName:
                            startedByProfile?.displayName ??
                            startedByProfile?.handle ??
                            startedByUsername,
                        avatarKey: startedByProfile?.avatarKey ?? null,
                    },
                    activeParticipants,
                });
            }
            sendJson(res, 200, { data: visibleMeetings });
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
        "/api/v1/modules/jitsi-meet/meetings/preflight",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
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
            const liveness = await checkHttpLiveness(config.instanceUrl, {
                timeoutMs: LIVELINESS_TIMEOUT_MS,
            });
            sendJson(res, 200, {
                data: {
                    ...liveness,
                    instanceUrl: config.instanceUrl,
                },
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

            const liveness = await checkHttpLiveness(
                resolved.meeting.meetingUrl,
                {
                    timeoutMs: LIVELINESS_TIMEOUT_MS,
                },
            );
            sendJson(res, 200, {
                data: liveness,
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
            const sessionId = String(body.sessionId ?? "").trim();
            const sessionPresence = sessionId
                ? presence.find(
                      (entry) =>
                          entry.username === resolved.requesterUsername &&
                          entry.sessionId === sessionId,
                  )
                : null;
            sendJson(res, 200, {
                data: {
                    state: resolved.state,
                    activeParticipants: store
                        .filterCurrentPresenceEntries(presence)
                        .map((entry) => entry.username),
                    sessionActive: sessionPresence
                        ? store.isPresenceEntryCurrent(sessionPresence)
                        : true,
                },
            });
        },
        { access: { minRole: "user" } },
    );
}
