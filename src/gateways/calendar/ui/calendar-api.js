import { apiFetch } from "/static/reuse/api-client.js";

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

async function fetchEvents(calendarId) {
    const response = await apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    if (!response.ok) throw new Error("calendar_events_failed");
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
    const response = await apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    );
    if (!response.ok) throw new Error("calendar_event_failed");
    const payload = await response.json();
    return payload?.data ?? null;
}

async function updateEvent(calendarId, eventId, payload) {
    return apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
            method: "PATCH",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
        },
    );
}

async function deleteEvent(calendarId, eventId, { deleteAll = false } = {}) {
    const query = deleteAll ? "?series=1" : "";
    return apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${query}`,
        {
            method: "DELETE",
        },
    );
}

async function respondToEvent(
    calendarId,
    eventId,
    response,
    { respondAll = false, targetCalendarId = null } = {},
) {
    const query = respondAll ? "?series=1" : "";
    return apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/respond${query}`,
        {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                response,
                ...(targetCalendarId ? { targetCalendarId } : {}),
            }),
        },
    );
}

async function probeJitsiAvailability() {
    const response = await apiFetch("/api/v1/modules/jitsi-meet/ping");
    if (!response.ok) return false;
    const payload = await response.json();
    return (
        Boolean(payload?.data?.ready) && Boolean(payload?.data?.configComplete)
    );
}

async function createJitsiMeeting(attendees) {
    const response = await apiFetch(
        "/api/v1/modules/jitsi-meet/meetings/create",
        {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ participants: attendees }),
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
    updateEvent,
    deleteEvent,
    respondToEvent,
    probeJitsiAvailability,
    createJitsiMeeting,
};
