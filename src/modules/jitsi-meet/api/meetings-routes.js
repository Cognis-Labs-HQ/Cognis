export function registerMeetingRoutes({
    router,
    store,
    profileStore,
    listCalendarsByOwner,
    listCalendarEvents,
    listClassroomParticipantHandles,
    resolveMeetingPayloadOrReject,
    createMeetingPayload,
    resolveRequesterUsername,
    canAccessMeeting,
    filterUsernamesForGuestVisibility,
    requireAuth,
    readJson,
    sendJson,
    sendError,
    checkHttpLiveness,
    LIVELINESS_TIMEOUT_MS,
    resolveShareGuestMeetingAccess,
}) {
    const parseDateTime = (value) => {
        const parsed = new Date(String(value ?? ""));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const parseDateOnly = (value) => {
        const normalized = String(value ?? "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
        const parsed = new Date(`${normalized}T00:00:00`);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const parseTimeMinutes = (value) => {
        const normalized = String(value ?? "").trim();
        const match = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
        if (!match) return null;
        return Number(match[1]) * 60 + Number(match[2]);
    };
    const overlapsWindow = (startAt, endAt, windowStart, windowEnd) =>
        startAt < windowEnd && endAt > windowStart;

    router.get(
        "/api/v1/modules/jitsi-meet/events/current",
        async (req, res) => {
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            if (
                typeof listCalendarsByOwner !== "function" ||
                typeof listCalendarEvents !== "function"
            ) {
                sendError(
                    res,
                    503,
                    "service_unavailable",
                    "Calendar capabilities are unavailable.",
                );
                return;
            }

            const requestUrl = new URL(req.url ?? "", "http://localhost");
            const startAtQuery = requestUrl.searchParams.get("startAt");
            const endAtQuery = requestUrl.searchParams.get("endAt");
            const dateQuery = requestUrl.searchParams.get("date");
            const timeStartQuery = requestUrl.searchParams.get("timeStart");
            const timeEndQuery = requestUrl.searchParams.get("timeEnd");
            const ownership = String(
                requestUrl.searchParams.get("ownership") ?? "all",
            )
                .trim()
                .toLowerCase();
            const meetingFilter = String(
                requestUrl.searchParams.get("hasMeeting") ?? "all",
            )
                .trim()
                .toLowerCase();

            if (!["all", "own", "invited"].includes(ownership)) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "ownership must be one of all, own, or invited.",
                );
                return;
            }
            if (
                !["all", "1", "0", "true", "false", "yes", "no"].includes(
                    meetingFilter,
                )
            ) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "hasMeeting must be all, true/false, yes/no, or 1/0.",
                );
                return;
            }
            if ((timeStartQuery || timeEndQuery) && !dateQuery) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "date is required when filtering by timeStart/timeEnd.",
                );
                return;
            }

            let windowStart = null;
            let windowEnd = null;
            if (startAtQuery || endAtQuery) {
                if (!startAtQuery || !endAtQuery) {
                    sendError(
                        res,
                        400,
                        "bad_request",
                        "startAt and endAt must be provided together.",
                    );
                    return;
                }
                windowStart = parseDateTime(startAtQuery);
                windowEnd = parseDateTime(endAtQuery);
                if (!windowStart || !windowEnd || windowEnd <= windowStart) {
                    sendError(
                        res,
                        400,
                        "bad_request",
                        "Invalid startAt/endAt range.",
                    );
                    return;
                }
            } else if (dateQuery) {
                const dateStart = parseDateOnly(dateQuery);
                if (!dateStart) {
                    sendError(res, 400, "bad_request", "Invalid date.");
                    return;
                }
                const startMinutes = timeStartQuery
                    ? parseTimeMinutes(timeStartQuery)
                    : 0;
                const endMinutes = timeEndQuery
                    ? parseTimeMinutes(timeEndQuery)
                    : 24 * 60;
                if (
                    startMinutes === null ||
                    endMinutes === null ||
                    endMinutes <= startMinutes
                ) {
                    sendError(res, 400, "bad_request", "Invalid time range.");
                    return;
                }
                windowStart = new Date(dateStart);
                windowStart.setMinutes(windowStart.getMinutes() + startMinutes);
                windowEnd = new Date(dateStart);
                windowEnd.setMinutes(windowEnd.getMinutes() + endMinutes);
            }

            const calendars = await listCalendarsByOwner(claims.sub);
            const eventRows = (
                await Promise.all(
                    calendars.map(async (calendar) => {
                        const events = await listCalendarEvents(calendar.id);
                        return events.map((event) => {
                            const isOwner = event.createdBy === claims.sub;
                            const isInvited = Array.isArray(event.attendees)
                                ? event.attendees.includes(claims.sub)
                                : false;
                            return {
                                id: event.id,
                                calendarId: calendar.id,
                                calendarName: calendar.name,
                                title: event.title,
                                description: event.description ?? null,
                                startAt: event.startAt,
                                endAt: event.endAt,
                                status: event.status,
                                recurrence: event.recurrence,
                                meetingUrl: event.meetingUrl ?? null,
                                createdBy: event.createdBy,
                                isOwner,
                                isInvited,
                            };
                        });
                    }),
                )
            )
                .flat()
                .filter((event) => event.isOwner || event.isInvited);

            const now = new Date();
            const filteredRows = eventRows
                .filter((event) => {
                    if (ownership === "own" && !event.isOwner) {
                        return false;
                    }
                    if (ownership === "invited" && !event.isInvited) {
                        return false;
                    }
                    const hasMeeting = Boolean(
                        String(event.meetingUrl ?? "").trim(),
                    );
                    if (
                        ["1", "true", "yes"].includes(meetingFilter) &&
                        !hasMeeting
                    ) {
                        return false;
                    }
                    if (
                        ["0", "false", "no"].includes(meetingFilter) &&
                        hasMeeting
                    ) {
                        return false;
                    }
                    const eventStart = parseDateTime(event.startAt);
                    const eventEnd = parseDateTime(event.endAt);
                    if (!eventStart || !eventEnd || eventEnd <= eventStart) {
                        return false;
                    }
                    if (
                        windowStart &&
                        windowEnd &&
                        !overlapsWindow(
                            eventStart,
                            eventEnd,
                            windowStart,
                            windowEnd,
                        )
                    ) {
                        return false;
                    }
                    if (!windowStart && eventEnd < now) {
                        return false;
                    }
                    return true;
                })
                .sort(
                    (left, right) =>
                        new Date(left.startAt).getTime() -
                        new Date(right.startAt).getTime(),
                );

            sendJson(res, 200, { data: filteredRows });
        },
        { access: { minRole: "user" } },
    );

    router.get(
        "/api/v1/modules/jitsi-meet/meetings/active",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            const requesterUsername = await resolveRequesterUsername(
                profileStore,
                claims.sub,
            ).catch((error) => {
                sendError(res, 409, "profile_required", error.message);
                return null;
            });
            if (!requesterUsername) return;
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
                const startedByUsername =
                    state.firstJoinedBy ?? meeting.createdBy ?? "";
                const startedByProfile = startedByUsername
                    ? await profileStore
                          .getProfileByHandle(startedByUsername)
                          .catch(() => null)
                    : null;
                const activeParticipantHandles = Array.isArray(
                    activeMeeting.activeUsernames,
                )
                    ? activeMeeting.activeUsernames
                    : [];
                const activeParticipantProfiles =
                    activeParticipantHandles.length > 0
                        ? await profileStore.searchProfiles(
                              "",
                              activeParticipantHandles.length,
                              {
                                  includeHidden: false,
                                  requesterAccountId: claims.sub,
                                  candidateHandles: activeParticipantHandles,
                              },
                          )
                        : [];
                const activeParticipants = activeParticipantProfiles.map(
                    (profile) => ({
                        username: profile.handle,
                        handle: profile.handle,
                        displayName: profile.displayName ?? profile.handle,
                        avatarKey: profile.avatarKey ?? null,
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
                    invitedParticipantCount: participants.length,
                    activeParticipantCount: Number(
                        activeMeeting.activeParticipantCount,
                    ),
                    activeSessionCount: Number(
                        activeMeeting.activeSessionCount,
                    ),
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
            const shareGuestAccess =
                typeof resolveShareGuestMeetingAccess === "function"
                    ? await resolveShareGuestMeetingAccess({
                          claims,
                          meetingId: String(body.meetingId ?? "").trim(),
                          requiredCapability: "meeting:join",
                      })
                    : { isGuest: false };
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
                const meetingId = String(body.meetingId ?? "").trim();
                const meeting = await store.getMeetingById(meetingId);
                if (!meeting) {
                    sendError(res, 404, "not_found", "Meeting not found.");
                    return;
                }
                const [rawParticipants, state] = await Promise.all([
                    store.listParticipants(meeting.id),
                    store.getMeetingState(meeting.id),
                ]);
                const participants =
                    typeof filterUsernamesForGuestVisibility === "function"
                        ? await filterUsernamesForGuestVisibility(
                              rawParticipants,
                          )
                        : rawParticipants;
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

            const resolved = await resolveMeetingPayloadOrReject({
                body,
                profileStore,
                store,
                claims,
                res,
                listClassroomParticipantHandles,
                profileStore,
                requesterAccountId: claims.sub,
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
                profileStore,
                requesterAccountId: claims.sub,
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
                profileStore,
                requesterAccountId: claims.sub,
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
                profileStore,
                requesterAccountId: claims.sub,
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
                profileStore,
                requesterAccountId: claims.sub,
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
                profileStore,
                requesterAccountId: claims.sub,
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
            const shareGuestAccess =
                typeof resolveShareGuestMeetingAccess === "function"
                    ? await resolveShareGuestMeetingAccess({
                          claims,
                          meetingId: String(body.meetingId ?? "").trim(),
                          requiredCapability: "meeting:join",
                      })
                    : { isGuest: false };
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
                const meetingId = String(body.meetingId ?? "").trim();
                const meeting = await store.getMeetingById(meetingId);
                if (!meeting) {
                    sendError(res, 404, "not_found", "Meeting not found.");
                    return;
                }
                const [state, presence] = await Promise.all([
                    store.getMeetingState(meeting.id),
                    store.listPresence(meeting.id),
                ]);
                sendJson(res, 200, {
                    data: {
                        state,
                        activeParticipants: await (async () => {
                            const activeUsernames = store
                                .filterCurrentPresenceEntries(presence)
                                .map((entry) => entry.username);
                            return typeof filterUsernamesForGuestVisibility ===
                                "function"
                                ? filterUsernamesForGuestVisibility(
                                      activeUsernames,
                                  )
                                : activeUsernames;
                        })(),
                        sessionActive: true,
                    },
                });
                return;
            }

            const resolved = await resolveMeetingPayloadOrReject({
                body,
                profileStore,
                store,
                claims,
                res,
                listClassroomParticipantHandles,
                profileStore,
                requesterAccountId: claims.sub,
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
