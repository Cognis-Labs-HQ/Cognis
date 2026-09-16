/**
 * Persists Advanced Preferences editor acknowledgement with the user's
 * server-backed preference profile.
 *
 * Public exports:
 *   loadEditorAcknowledgement() — reads whether the current user accepted the warning.
 *   saveEditorAcknowledgement() — records warning acceptance for the current user.
 *
 * Usage:
 *   const accepted = await loadEditorAcknowledgement();
 *   await saveEditorAcknowledgement();
 *
 * @returns {Promise<boolean>}
 */
import { apiFetch } from "../../reuse/api-client.js";

const PREFERENCE_KEY = "preferences-editor-acknowledgement";

export async function loadEditorAcknowledgement() {
    const account = localStorage.getItem("cognis_account");
    if (!account) return false;
    const response = await apiFetch(
        `/api/v1/social/users/${encodeURIComponent(account)}/preferences/${PREFERENCE_KEY}`,
    );
    if (!response.ok) return false;
    const payload = await response.json();
    const rawAcknowledgement = payload?.data?.layoutJson;
    if (!rawAcknowledgement) return false;
    return JSON.parse(rawAcknowledgement)?.accepted === true;
}

export async function saveEditorAcknowledgement() {
    const account = localStorage.getItem("cognis_account");
    if (!account) return;
    const response = await apiFetch(
        `/api/v1/social/users/${encodeURIComponent(account)}/preferences/${PREFERENCE_KEY}`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ layout: { accepted: true } }),
        },
    );
    if (!response.ok)
        throw new Error("preferences_acknowledgement_save_failed");
}
