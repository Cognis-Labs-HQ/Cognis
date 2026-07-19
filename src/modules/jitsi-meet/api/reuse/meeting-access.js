import { normalizeHandleKey } from "../../../../api/reuse/normalize-handle.js";
import {
    hasShareCapability,
    resolveShareGuestId,
} from "../../../../gateways/share/reuse/share-guest.js";
import { resolveRequesterUsername } from "./requester.js";

/**
 * Derives the synthetic presence username used to track a share guest's
 * attendance in `jitsi_meeting_presence`. Share guests have no account, so
 * without a stable identifier they never appear in `activeParticipants`,
 * which makes the meeting host's "alone in meeting" check fire even while a
 * guest is actively present. Prefixing with "guest:" keeps this identifier
 * out of any real username namespace.
 *
 * @param {{ sub?: string } | undefined} claims
 * @returns {string} The `guest:<id>` presence username, or `""` when the
 *   claims do not resolve to a share guest.
 */
export function resolveShareGuestPresenceUsername(claims) {
    const shareGuestId = resolveShareGuestId(claims);
    return shareGuestId ? `guest:${shareGuestId}` : "";
}

export async function resolveShareGuestMeetingAccess({
    claims,
    meetingId,
    getShareTokenById,
    requiredCapability = "",
}) {
    const shareGuestId = resolveShareGuestId(claims);
    if (!shareGuestId) {
        return { isGuest: false, allowed: false, tokenRecord: null };
    }
    if (typeof getShareTokenById !== "function") {
        return { isGuest: true, allowed: false, tokenRecord: null };
    }
    const tokenRecord = await getShareTokenById(shareGuestId).catch(() => null);
    if (!tokenRecord) {
        return { isGuest: true, allowed: false, tokenRecord: null };
    }
    const matchesMeeting =
        tokenRecord.resourceType === "meeting" &&
        tokenRecord.resourceId === meetingId;
    if (!matchesMeeting) {
        return { isGuest: true, allowed: false, tokenRecord: null };
    }
    const allowed = hasShareCapability(tokenRecord, requiredCapability);
    return {
        isGuest: true,
        allowed,
        tokenRecord: allowed ? tokenRecord : null,
    };
}

export async function resolveRequestedParticipants(
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

/**
 * Filters a list of usernames down to only those whose profile visibility
 * preference permits anonymous/guest viewers. Share guests have no account
 * and can never be a "friend", so only `community`-visibility profiles are
 * shown to them; `hidden`, `private`, and `friends` profiles are omitted.
 *
 * @param {{ getProfileByHandle: (handle: string) => Promise<{ visibility?: string } | null> }} profileStore
 * @param {string[]} usernames
 * @returns {Promise<string[]>}
 */
export async function filterUsernamesForGuestVisibility(
    profileStore,
    usernames,
) {
    const visibleUsernames = [];
    for (const candidate of Array.isArray(usernames) ? usernames : []) {
        const normalizedHandle = normalizeHandleKey(candidate);
        if (!normalizedHandle) continue;
        const profile = await profileStore
            .getProfileByHandle(normalizedHandle)
            .catch(() => null);
        if (profile?.visibility === "community") {
            visibleUsernames.push(normalizedHandle);
        }
    }
    return visibleUsernames;
}

export async function canAccessMeeting({
    store,
    meeting,
    username,
    listClassroomParticipantHandles,
    profileStore = null,
    requesterAccountId = "",
}) {
    const directParticipants = await store.listParticipants(meeting.id);
    if (profileStore && requesterAccountId) {
        const possibleBlockingUsers = Array.from(
            new Set([meeting.createdBy, ...directParticipants]),
        ).filter(Boolean);
        for (const handle of possibleBlockingUsers) {
            const profile = await profileStore
                .getProfileByHandle(handle)
                .catch(() => null);
            if (
                profile?.accountId &&
                profile.accountId !== requesterAccountId &&
                (await profileStore.isBlocked(
                    profile.accountId,
                    requesterAccountId,
                ))
            ) {
                return false;
            }
        }
    }
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

export async function resolveMeetingPayloadOrReject({
    body,
    profileStore,
    store,
    claims,
    sendError,
    res,
    listClassroomParticipantHandles,
}) {
    const requesterUsername = await resolveRequesterUsername(
        profileStore,
        claims.sub,
    ).catch((error) => {
        sendError(res, 409, "profile_required", error.message);
        return null;
    });
    if (!requesterUsername) return null;
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
        profileStore,
        requesterAccountId: claims.sub,
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

export async function createMeetingPayload({
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
