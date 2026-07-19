/**
 * Share-gateway-owned client helpers for components that create share tokens.
 *
 * Public exports:
 *   resolveShareExpiry(expiresInHours) — converts a relative hour count into
 *     an ISO timestamp or an empty value for non-expiring links.
 *   buildShareTokenCallbacks(options) — returns popup callbacks backed by the
 *     Share gateway token API for one resource.
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

export function resolveShareExpiry(expiresInHours) {
    const hours = Number(expiresInHours);
    return Number.isFinite(hours) && hours > 0
        ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
        : "";
}

/**
 * @param {{resourceType: string, resourceId: string, grantedCapabilities: string[]}} options
 * @returns {{fetchLinks: () => Promise<Array>, createLink: (input: {label: string, expiresInHours: number|string}) => Promise<object|null>, deleteLink: (input: {shareId: string}) => Promise<void>}}
 */
export function buildShareTokenCallbacks({
    resourceType,
    resourceId,
    grantedCapabilities,
} = {}) {
    return {
        fetchLinks: async () => {
            const response = await apiFetch(
                `${SHARE_API}?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`,
            );
            const payload = await response.json().catch(() => ({ data: [] }));
            return Array.isArray(payload?.data) ? payload.data : [];
        },
        createLink: async ({ label, expiresInHours }) => {
            const response = await apiFetch(SHARE_API, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    resourceType,
                    resourceId,
                    label,
                    expiresAt: resolveShareExpiry(expiresInHours),
                    grantedCapabilities,
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
