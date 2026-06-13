import { resolveExternalBaseUrl } from "../../../api/reuse/url-parts.js";

const MEETING_TITLE = "Cognis Classroom";

export function sendJson(res, status, payload) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}

export function sendError(res, status, code, message) {
    sendJson(res, status, {
        error: {
            code,
            message,
        },
    });
}

export function buildMeetingChatTitle(createdAt = null) {
    const parsedCreatedAt =
        typeof createdAt === "string" ? Date.parse(createdAt) : Number.NaN;
    const isoDate = Number.isFinite(parsedCreatedAt)
        ? new Date(parsedCreatedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    return `${MEETING_TITLE} — ${isoDate}`;
}

export function buildMeetingActionUrl(meetingId) {
    const normalizedMeetingId = String(meetingId ?? "").trim();
    if (!normalizedMeetingId) {
        return "/meetings";
    }
    return `/meetings?meetingId=${encodeURIComponent(normalizedMeetingId)}`;
}

export function buildMeetingEmailLink(meetingId) {
    const actionUrl = buildMeetingActionUrl(meetingId);
    const externalHost = resolveExternalBaseUrl();
    return externalHost ? `${externalHost}${actionUrl}` : actionUrl;
}

export function appendMeetingLinkToBody(body, meetingId) {
    const meetingLink = buildMeetingEmailLink(meetingId);
    if (!meetingLink) return body;
    return `${body}\n\nMeeting link: ${meetingLink}`;
}
