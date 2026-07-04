/**
 * Generic per-page user preference persistence via the social preferences API.
 *
 * Public exports:
 *   - `loadPagePreferences(pageId)` — loads the stored JSON object for a page
 *     preference slot by page ID, or null when unavailable.
 *   - `savePagePreferences(pageId, data)` — persists a preference object for
 *     a page ID, merging with any existing stored values.
 *
 * Usage:
 *   ```js
 *   import { loadPagePreferences, savePagePreferences } from '/static/reuse/page-preferences.js';
 *   const prefs = await loadPagePreferences('my-page-id');
 *   await savePagePreferences('my-page-id', { theme: 'dark' });
 *   ```
 *
 * @param {string} pageId Unique page preference slot identifier.
 * @returns {Promise<object|null>}
 */
import { apiFetch } from "./api-client.js";

function preferenceUrl(accountId, pageId) {
    return `/api/v1/social/users/${encodeURIComponent(accountId)}/preferences/${encodeURIComponent(pageId)}`;
}

function hasPreferenceApiContext() {
    return Boolean(
        localStorage.getItem("cognis_account") &&
        localStorage.getItem("cognis_access_token"),
    );
}

export async function loadPagePreferences(pageId) {
    const account = localStorage.getItem("cognis_account");
    if (!account || !hasPreferenceApiContext()) return null;
    try {
        const response = await apiFetch(preferenceUrl(account, pageId));
        if (!response.ok) return null;
        const payload = await response.json().catch(() => ({ data: null }));
        const raw = payload?.data?.layoutJson;
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

export async function savePagePreferences(pageId, data) {
    const account = localStorage.getItem("cognis_account");
    if (!account || !hasPreferenceApiContext()) return;
    const current = await loadPagePreferences(pageId);
    const merged = { ...(current ?? {}), ...data };
    await apiFetch(preferenceUrl(account, pageId), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ layout: merged }),
    });
}
