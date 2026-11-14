/**
 * Persists release-changelog acknowledgement state separately from editable UI
 * preferences.
 *
 * Public exports:
 *   loadReleaseChangelogState() — loads the current account's acknowledgement state.
 *   saveReleaseChangelogState(state) — replaces the acknowledgement state.
 *
 * Usage:
 *   const state = await loadReleaseChangelogState();
 *   await saveReleaseChangelogState({ seenSlugs: state.seenSlugs });
 *
 * @returns {Promise<{ seenSlugs: string[], lastVersion: string|null }>}
 */
import { apiFetch } from "../../reuse/api-client.js";

const PREFERENCE_KEY = "release-changelog-state";

export async function loadReleaseChangelogState() {
    const account = localStorage.getItem("cognis_account");
    if (!account) return { seenSlugs: [], lastVersion: null };
    const response = await apiFetch(
        `/api/v1/social/users/${encodeURIComponent(account)}/preferences/${PREFERENCE_KEY}`,
    );
    if (!response.ok) return { seenSlugs: [], lastVersion: null };
    const payload = await response.json();
    const rawState = payload?.data?.layoutJson;
    if (!rawState) return { seenSlugs: [], lastVersion: null };
    const state = JSON.parse(rawState);
    return {
        seenSlugs: Array.isArray(state?.seenSlugs) ? state.seenSlugs : [],
        lastVersion:
            typeof state?.lastVersion === "string" ? state.lastVersion : null,
    };
}

export async function saveReleaseChangelogState(state) {
    const account = localStorage.getItem("cognis_account");
    if (!account) return;
    await apiFetch(
        `/api/v1/social/users/${encodeURIComponent(account)}/preferences/${PREFERENCE_KEY}`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ layout: state }),
        },
    );
}
