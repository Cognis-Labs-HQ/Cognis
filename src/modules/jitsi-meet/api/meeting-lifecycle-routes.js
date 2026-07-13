import { randomUUID } from "node:crypto";

export function registerMeetingLifecycleRoutes({
    router,
    store,
    requireAuth,
    readJson,
    sendJson,
    sendError,
    profileStore,
    resolveRequesterUsername,
    resolveRequestedParticipants,
    hasMinRole,
    createMeetingPayload,
    resolveMeetingPayload,
    resolveShareGuestMeetingAccess,
    resolveShareGuestPresenceUsername,
    listClassroomParticipantHandles,
    canAccessMeeting,
    resolveGroupChat,
    buildMeetingChatTitle,
    dispatchMeetingNotifications,
    resolveModeratorUsernames,
}) {
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

            if (normalizedInput.participantUsernames.length < 1) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "At least one valid meeting participant is required.",
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
            const meetingId = String(body.meetingId ?? "").trim();
            const shareGuestAccess = await resolveShareGuestMeetingAccess({
                claims,
                meetingId,
                requiredCapability: "meeting:join",
            });
            if (shareGuestAccess.isGuest) {
                if (!meetingId) {
                    sendError(
                        res,
                        400,
                        "bad_request",
                        "meetingId is required.",
                    );
                    return;
                }
                if (!shareGuestAccess.allowed) {
                    sendError(
                        res,
                        403,
                        "forbidden",
                        "Share guest access is not allowed for this meeting.",
                    );
                    return;
                }
                const meeting = await store.getMeetingById(meetingId);
                if (!meeting) {
                    sendError(res, 404, "not_found", "Meeting not found.");
                    return;
                }
                const [participants, state] = await Promise.all([
                    store.listParticipants(meeting.id),
                    store.getMeetingState(meeting.id),
                ]);
                const payload = await createMeetingPayload({
                    store,
                    meeting,
                    state,
                    participants,
                    requesterUsername: meeting.createdBy,
                    chatUrl: meeting.chatRoomId
                        ? `/messages/${encodeURIComponent(meeting.chatRoomId)}`
                        : null,
                    requiresReclaim: false,
                });
                sendJson(res, 200, {
                    data: {
                        ...payload,
                        readOnly: true,
                    },
                });
                return;
            }

            const resolved = await resolveMeetingPayload({
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
                    instanceId: randomUUID(),
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
            ).catch((error) => {
                sendError(res, 409, "profile_required", error.message);
                return null;
            });
            if (!requesterUsername) return;
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
                    store
                        .filterCurrentPresenceEntries(presence)
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
            const shareGuestAccess = await resolveShareGuestMeetingAccess({
                claims,
                meetingId: String(body.meetingId ?? "").trim(),
                requiredCapability: "meeting:join",
            });
            if (shareGuestAccess.isGuest) {
                if (!shareGuestAccess.allowed) {
                    sendError(
                        res,
                        403,
                        "forbidden",
                        "Share guest access is not allowed for this meeting.",
                    );
                    return;
                }
                const guestMeetingId = String(body.meetingId ?? "").trim();
                const guestSessionId = String(body.sessionId ?? "").trim();
                const guestPresenceUsername =
                    resolveShareGuestPresenceUsername(claims);
                if (guestMeetingId && guestSessionId && guestPresenceUsername) {
                    await store.upsertPresence(
                        guestMeetingId,
                        guestPresenceUsername,
                        guestSessionId,
                        body.active !== false,
                    );
                }
                sendJson(res, 200, {
                    data: {
                        ok: true,
                        meetingClosed: false,
                    },
                });
                return;
            }

            const resolved = await resolveMeetingPayload({
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
}
