import { apiFetch } from "/static/reuse/api-client.js";

/** Reads email metadata through the notification owner's authorized endpoint. */
export async function loadUserEmails(accountId, { signal } = {}) {
    const response = await apiFetch(
        `/api/v1/notify/users/${encodeURIComponent(accountId)}/emails`,
        { signal },
    );
    if (!response.ok) throw new Error("user_email_metadata_unavailable");
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}
