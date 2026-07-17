import { apiFetch } from "/static/reuse/api-client.js";

const SHARE_API = "/api/v1/share/tokens";
const WHITEBOARD_SHARE_CAPABILITIES = ["whiteboard:read", "whiteboard:write"];

function resolveExpiry(expiresInHours) {
    const hours = Number(expiresInHours);
    return Number.isFinite(hours) && hours > 0
        ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
        : "";
}

export function buildShareCallbacks(whiteboardId) {
    return {
        fetchLinks: async () => {
            const response = await apiFetch(
                `${SHARE_API}?resourceType=whiteboard&resourceId=${encodeURIComponent(whiteboardId)}`,
            );
            const payload = await response.json().catch(() => ({ data: [] }));
            return Array.isArray(payload?.data) ? payload.data : [];
        },
        createLink: async ({ label, expiresInHours }) => {
            const response = await apiFetch(SHARE_API, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    resourceType: "whiteboard",
                    resourceId: whiteboardId,
                    label,
                    expiresAt: resolveExpiry(expiresInHours),
                    grantedCapabilities: WHITEBOARD_SHARE_CAPABILITIES,
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
