import { buildShareTokenCallbacks } from "/static/gateways/share/ui/reuse/share-api.js";

const MEETING_SHARE_CAPABILITIES = [
    "meeting:join",
    "participants:read",
    "chat:read",
    "chat:write",
];

export function buildShareCallbacks(meetingId) {
    return buildShareTokenCallbacks({
        resourceType: "meeting",
        resourceId: meetingId,
        contentUrl: `/meetings?meetingId=${encodeURIComponent(meetingId)}`,
        grantedCapabilities: MEETING_SHARE_CAPABILITIES,
    });
}
