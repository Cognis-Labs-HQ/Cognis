/**
 * Share-gateway-owned client helpers for components that create share tokens.
 *
 * Public exports:
 *   resolveShareExpiry(expiresInHours) — converts a relative hour count into
 *     an ISO timestamp or an empty value for non-expiring links.
 *   buildShareTokenCallbacks(options) — returns popup callbacks backed by the
 *     Share gateway token API for one resource.
 *   fetchShareOverview() — lists shares sent and received by the active user.
 *   revokeShare(shareId) — revokes a share owned by the active user.
 *   rejectShare(shareId) — rejects a share received by the active user.
 *
 * Usage:
 *   const callbacks = buildShareTokenCallbacks({
 *     resourceType: "meeting",
 *     resourceId: meetingId,
 *     grantedCapabilities: ["meeting:join"],
 *   });
 *
 * @param {number|string} expiresInHours Relative expiry in hours.
 * @returns {string} ISO expiry timestamp, or an empty string for no expiry.
 */
import { apiFetch } from "/static/reuse/api-client.js";

const SHARE_API = "/api/v1/share/tokens";
const SHARE_METHODS_API = "/api/v1/share/methods";

export function resolveShareExpiry(expiresInHours) {
    const hours = Number(expiresInHours);
    return Number.isFinite(hours) && hours > 0
        ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
        : "";
}

export async function fetchShareOverview() {
    const response = await apiFetch("/api/v1/share/overview");
    if (!response.ok) throw new Error("share_overview_failed");
    const payload = await response.json();
    return {
        sent: Array.isArray(payload?.data?.sent) ? payload.data.sent : [],
        received: Array.isArray(payload?.data?.received)
            ? payload.data.received
            : [],
    };
}

/** @param {string} shareId @returns {Promise<Response>} */
export async function revokeShare(shareId) {
    return apiFetch(`${SHARE_API}/${encodeURIComponent(shareId)}`, {
        method: "DELETE",
    });
}

/** @param {string} shareId @returns {Promise<Response>} */
export async function rejectShare(shareId) {
    return apiFetch(`${SHARE_API}/${encodeURIComponent(shareId)}/reject`, {
        method: "POST",
    });
}

/**
 * @param {{resourceType: string, resourceId: string, grantedCapabilities: string[]}} options
 * @returns {{fetchLinks: () => Promise<Array>, createLink: (input: {label: string, expiresInHours: number|string, recipients?: Array}) => Promise<object|null>, updateLink: (input: {shareId: string, accessControls: object}) => Promise<object|null>, deleteLink: (input: {shareId: string}) => Promise<void>, searchUsers: (query: string) => Promise<Array>}}
 */
export function buildShareTokenCallbacks({
    resourceType,
    resourceId,
    contentUrl,
    grantedCapabilities,
} = {}) {
    return {
        fetchMethods: async () => {
            const response = await apiFetch(SHARE_METHODS_API);
            if (!response.ok) throw new Error("methods_failed");
            const payload = await response.json().catch(() => ({ data: [] }));
            return Array.isArray(payload?.data) ? payload.data : [];
        },
        fetchLinks: async () => {
            const response = await apiFetch(
                `${SHARE_API}?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`,
            );
            if (!response.ok) throw new Error("links_failed");
            const payload = await response.json().catch(() => ({ data: [] }));
            return Array.isArray(payload?.data) ? payload.data : [];
        },
        createLink: async ({
            label,
            expiresAt = "",
            expiresInHours,
            recipients = [],
            shareMethod = "link",
            password = "",
            accessControls = {},
            grantedCapabilities: requestedCapabilities,
        }) => {
            const response = await apiFetch(SHARE_API, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    resourceType,
                    resourceId,
                    contentUrl,
                    label,
                    expiresAt:
                        String(expiresAt ?? "").trim() ||
                        resolveShareExpiry(expiresInHours),
                    grantedCapabilities: Array.isArray(requestedCapabilities)
                        ? requestedCapabilities
                        : grantedCapabilities,
                    accessControls: { ...accessControls, recipients },
                    recipients,
                    shareMethod,
                    password: String(password ?? ""),
                }),
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                const error = new Error(
                    String(payload?.error?.code ?? "create_failed"),
                );
                error.code = payload?.error?.code;
                throw error;
            }
            const payload = await response.json().catch(() => ({ data: null }));
            return payload?.data ?? null;
        },
        updateLink: async ({
            shareId,
            label,
            expiresAt,
            password,
            accessControls,
            grantedCapabilities: requestedCapabilities,
        }) => {
            const response = await apiFetch(
                `${SHARE_API}/${encodeURIComponent(shareId)}`,
                {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        label,
                        expiresAt: String(expiresAt ?? "").trim() || undefined,
                        password,
                        accessControls,
                        grantedCapabilities: requestedCapabilities,
                    }),
                },
            );
            if (!response.ok) throw new Error("update_failed");
            const payload = await response.json().catch(() => ({ data: null }));
            return payload?.data ?? null;
        },
        searchUsers: async (query) => {
            const normalizedQuery = String(query ?? "").trim();
            if (!normalizedQuery) return [];
            const response = await apiFetch(
                `/api/v1/share/recipients/users?q=${encodeURIComponent(normalizedQuery)}`,
            );
            if (!response.ok) throw new Error("search_failed");
            const payload = await response.json().catch(() => ({ data: [] }));
            return Array.isArray(payload?.data) ? payload.data : [];
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
