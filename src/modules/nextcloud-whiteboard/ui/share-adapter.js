import { apiFetch } from "/static/reuse/api-client.js";

const SHARE_API = "/api/v1/modules/nextcloud-whiteboard/share";

export function buildShareCallbacks(whiteboardId) {
    return {
        fetchLinks: async () => {
            const response = await apiFetch(
                `${SHARE_API}?whiteboardId=${encodeURIComponent(whiteboardId)}`,
            );
            const payload = await response.json().catch(() => ({ data: [] }));
            return Array.isArray(payload?.data) ? payload.data : [];
        },
        createLink: async ({ label, expiresInHours }) => {
            const response = await apiFetch(SHARE_API, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ whiteboardId, label, expiresInHours }),
            });
            if (!response.ok) throw new Error("create_failed");
            const payload = await response.json().catch(() => ({ data: null }));
            return payload?.data ?? null;
        },
        deleteLink: async ({ shareId }) => {
            const response = await apiFetch(`${SHARE_API}/delete`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ whiteboardId, shareId }),
            });
            if (!response.ok) throw new Error("delete_failed");
        },
    };
}
