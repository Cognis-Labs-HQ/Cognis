import { apiFetch } from "/static/reuse/api-client.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

const shareAccessByCalendarId = new Map();

function refusedSecretError() {
    const error = new Error("calendar_share_secrets_refused");
    error.code = error.message;
    return error;
}

async function requestCalendarResource(
    calendarId,
    request,
    { promptWhenLocked = true } = {},
) {
    const shareAccess = shareAccessByCalendarId.get(String(calendarId));
    if (!shareAccess?.sharePasswordProtected || !shareAccess?.shareId) {
        return request(null);
    }
    if (!promptWhenLocked) {
        if (!uiCtx.capabilities.get("keyring:isUnlocked")?.()) {
            throw refusedSecretError();
        }
        const storedPassword = uiCtx.capabilities
            .get("keyring:forComponent")?.("Calendar Gateway")
            ?.get(`share:${shareAccess.shareId}`);
        if (!storedPassword) throw refusedSecretError();
        return request(storedPassword);
    }
    const fetchProtected = uiCtx.capabilities.get(
        "share:fetchProtectedResource",
    );
    if (!fetchProtected) throw new Error("calendar_share_password_unavailable");
    return fetchProtected({ shareId: shareAccess.shareId, request });
}

async function fetchCalendarState() {
    const response = await apiFetch("/api/v1/calendar/calendars");
    if (!response.ok) throw new Error("calendar_load_failed");
    const payload = await response.json();
    return {
        calendars: Array.isArray(payload?.data) ? payload.data : [],
        meta:
            payload && typeof payload.meta === "object" && payload.meta
                ? payload.meta
                : {},
    };
}

async function fetchEvents(
    calendarId,
    shareAccess = null,
    { promptWhenLocked = false } = {},
) {
    if (shareAccess) {
        shareAccessByCalendarId.set(String(calendarId), shareAccess);
    }
    const request = (password) =>
        apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events`,
            password
                ? { headers: { "x-cognis-share-password": password } }
                : undefined,
        );
    const response = await requestCalendarResource(calendarId, request, {
        promptWhenLocked,
    });
    if (!response) throw new Error("calendar_share_password_unavailable");
    if (!response.ok) {
        const error =
            response.status === 401
                ? refusedSecretError()
                : new Error("calendar_events_failed");
        error.code = error.message;
        throw error;
    }
    const payload = await response.json();
    return Array.isArray(payload?.data?.events) ? payload.data.events : [];
}

async function fetchInvitations() {
    const response = await apiFetch("/api/v1/calendar/invitations");
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

async function fetchEvent(calendarId, eventId) {
    const response = await requestCalendarResource(calendarId, (password) =>
        apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            password
                ? { headers: { "x-cognis-share-password": password } }
                : undefined,
        ),
    );
    if (!response.ok) throw new Error("calendar_event_failed");
    const payload = await response.json();
    return payload?.data ?? null;
}

async function createEvent(calendarId, payload) {
    return requestCalendarResource(calendarId, (password) =>
        apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    ...(password
                        ? { "x-cognis-share-password": password }
                        : {}),
                },
                body: JSON.stringify(payload),
            },
        ),
    );
}

async function updateEvent(calendarId, eventId, payload) {
    return requestCalendarResource(calendarId, (password) =>
        apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            {
                method: "PATCH",
                headers: {
                    "content-type": "application/json",
                    ...(password
                        ? { "x-cognis-share-password": password }
                        : {}),
                },
                body: JSON.stringify(payload),
            },
        ),
    );
}

async function deleteEvent(calendarId, eventId, { deleteAll = false } = {}) {
    const query = deleteAll ? "?series=1" : "";
    return requestCalendarResource(calendarId, (password) =>
        apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${query}`,
            {
                method: "DELETE",
                ...(password
                    ? { headers: { "x-cognis-share-password": password } }
                    : {}),
            },
        ),
    );
}

async function respondToEvent(
    calendarId,
    eventId,
    response,
    { respondAll = false, targetCalendarId = null } = {},
) {
    const query = respondAll ? "?series=1" : "";
    return requestCalendarResource(calendarId, (password) =>
        apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/respond${query}`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    ...(password
                        ? { "x-cognis-share-password": password }
                        : {}),
                },
                body: JSON.stringify({
                    response,
                    ...(targetCalendarId ? { targetCalendarId } : {}),
                }),
            },
        ),
    );
}

async function createJitsiMeeting(attendees, { scheduledAt = null } = {}) {
    const response = await apiFetch(
        "/api/v1/modules/jitsi-meet/meetings/create",
        {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ participants: attendees, scheduledAt }),
        },
    );
    if (!response.ok) throw new Error("meeting_create_failed");
    const payload = await response.json();
    const meetingId = String(payload?.data?.id ?? "").trim();
    if (meetingId) {
        // Prefer the in-app Meetings route so join flows stay within Cognis UI.
        return `${window.location.origin}/meetings?meetingId=${encodeURIComponent(meetingId)}`;
    }
    return payload?.data?.meetingUrl ? String(payload.data.meetingUrl) : null;
}

export {
    fetchCalendarState,
    fetchEvents,
    fetchInvitations,
    fetchEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    respondToEvent,
    createJitsiMeeting,
};
