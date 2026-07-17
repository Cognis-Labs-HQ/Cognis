import { apiFetch } from "/static/reuse/api-client.js";

const SHARE_API = "/api/v1/share/tokens";
const MEETING_SHARE_CAPABILITIES = [
    "meeting:join",
    "participants:read",
    "chat:read",
    "chat:write",
];

function resolveExpiry(expiresInHours) {
    const hours = Number(expiresInHours);
    return Number.isFinite(hours) && hours > 0
        ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
        : "";
}

export function buildShareCallbacks(meetingId) {
    return {
        fetchLinks: async () => {
            const response = await apiFetch(
                `${SHARE_API}?resourceType=meeting&resourceId=${encodeURIComponent(meetingId)}`,
            );
            const payload = await response.json().catch(() => ({ data: [] }));
            return Array.isArray(payload?.data) ? payload.data : [];
        },
        createLink: async ({ label, expiresInHours }) => {
            const response = await apiFetch(SHARE_API, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    resourceType: "meeting",
                    resourceId: meetingId,
                    label,
                    expiresAt: resolveExpiry(expiresInHours),
                    grantedCapabilities: MEETING_SHARE_CAPABILITIES,
                }),
            });
            if (!response.ok) throw new Error("create_failed");
            const payload = await response.json().catch(() => ({ data: null }));
            return payload?.data ?? null;
        },
        deleteLink: async ({ shareId }) => {
            const response = await apiFetch(
                `${SHARE_API}/${encodeURIComponent(shareId)}`,
                { method: "DELETE" },
            );
            if (!response.ok) throw new Error("delete_failed");
        },
    };
}
