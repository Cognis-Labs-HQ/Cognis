import { apiFetch } from "/static/reuse/api-client.js";

const PREFERENCE_PAGE_ID = "classes-classroom-ui-preferences";

function hasPreferenceApiContext() {
    return Boolean(
        localStorage.getItem("cognis_account") &&
            localStorage.getItem("cognis_access_token"),
    );
}

export function normalizeTileLayout(value) {
    return value === "slideshow" ? "slideshow" : "stacked";
}

async function loadStoredPreferences() {
    const accountId = localStorage.getItem("cognis_account");
    if (!accountId || !hasPreferenceApiContext()) {
        return {};
    }
    try {
        const response = await apiFetch(
            `/api/v1/social/users/${encodeURIComponent(accountId)}/preferences/${encodeURIComponent(PREFERENCE_PAGE_ID)}`,
        );
        if (!response.ok) {
            return {};
        }
        const payload = await response.json().catch(() => ({ data: null }));
        const rawLayout = payload?.data?.layoutJson;
        if (!rawLayout) {
            return {};
        }
        const parsed = JSON.parse(rawLayout);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export async function loadTileLayoutPreference() {
    const storedPreferences = await loadStoredPreferences();
    return normalizeTileLayout(storedPreferences?.tileLayout);
}

export async function saveTileLayoutPreference(tileLayout) {
    const accountId = localStorage.getItem("cognis_account");
    if (!accountId || !hasPreferenceApiContext()) {
        return;
    }
    const storedPreferences = await loadStoredPreferences();
    const nextPreferences = {
        ...storedPreferences,
        tileLayout: normalizeTileLayout(tileLayout),
    };
    await apiFetch(
        `/api/v1/social/users/${encodeURIComponent(accountId)}/preferences/${encodeURIComponent(PREFERENCE_PAGE_ID)}`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ layout: nextPreferences }),
        },
    );
}
