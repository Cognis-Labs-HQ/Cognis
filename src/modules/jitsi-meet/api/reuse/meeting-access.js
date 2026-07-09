import { normalizeHandleKey } from "../../../../api/reuse/normalize-handle.js";
import { resolveRequesterUsername } from "./requester.js";

export function resolveShareGuestId(claims) {
    const subject = String(claims?.sub ?? "").trim();
    if (!subject.startsWith("share:")) return "";
    return subject.slice("share:".length).trim();
}

export function hasShareCapability(tokenRecord, requiredCapability) {
    if (!requiredCapability) return true;
    const grantedCapabilities = Array.isArray(tokenRecord?.grantedCapabilities)
        ? tokenRecord.grantedCapabilities
        : [];
    return grantedCapabilities.includes(requiredCapability);
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

export async function canAccessMeeting({
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
