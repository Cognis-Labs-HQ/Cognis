import { apiFetch } from "/static/reuse/api-client.js";

const SHARE_API = "/api/v1/modules/jitsi-meet/share";

export function buildShareCallbacks(meetingId) {
    return {
        fetchLinks: async () => {
            const response = await apiFetch(
                `${SHARE_API}?meetingId=${encodeURIComponent(meetingId)}`,
            );
            const payload = await response.json().catch(() => ({ data: [] }));
            return Array.isArray(payload?.data) ? payload.data : [];
        },
        createLink: async ({ label, expiresInHours }) => {
            const response = await apiFetch(SHARE_API, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ meetingId, label, expiresInHours }),
            });
            if (!response.ok) throw new Error("create_failed");
            const payload = await response.json().catch(() => ({ data: null }));
            return payload?.data ?? null;
        },
        deleteLink: async ({ shareId }) => {
            const response = await apiFetch(`${SHARE_API}/delete`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ meetingId, shareId }),
            });
            if (!response.ok) throw new Error("delete_failed");
        },
    };
}
