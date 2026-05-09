/**
 * Loads and applies persisted UI preferences (font family and font size).
 *
 * - loadUiPreferences()       — fetches the current account's ui-preferences from the API.
 *                               Returns the parsed prefs object or null on failure.
 * - applyUiPreferences(prefs) — writes --app-font and --app-font-size CSS custom properties
 *                               onto <html> immediately (legacy rem values are converted to pt).
 *
 * Usage:
 *   const prefs = await loadUiPreferences();
 *   applyUiPreferences(prefs);
 */
import { apiFetch } from "./api-client.js";

function hasPreferenceApiContext() {
    return Boolean(
        localStorage.getItem("cognis_account") &&
        localStorage.getItem("cognis_access_token"),
    );
}

export async function loadUiPreferences() {
    const account = localStorage.getItem("cognis_account");
    if (!account || !hasPreferenceApiContext()) return null;
    try {
        const response = await apiFetch(
            `/api/v1/users/${encodeURIComponent(account)}/preferences/ui-preferences`,
        );
        if (!response.ok) return null;
        const payload = await response.json();
        const raw = payload?.data?.layoutJson;
        if (!raw) return null;
        return JSON.parse(raw) || null;
    } catch {
        return null;
    }
}

export async function saveUiPreferences(patch) {
    const account = localStorage.getItem("cognis_account");
    if (!account || !hasPreferenceApiContext()) return;
    const current = await loadUiPreferences();
    const merged = { ...(current || {}), ...patch };
    await apiFetch(
        `/api/v1/users/${encodeURIComponent(account)}/preferences/ui-preferences`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ layout: merged }),
        },
    );
}

export function applyUiPreferences(prefs) {
    if (!prefs) return;
    const fontFamily = prefs.appFont || prefs.greetingFont;
    if (fontFamily) {
        document.documentElement.style.setProperty("--app-font", fontFamily);
    }
    const rawSize = prefs.appFontSize ?? prefs.greetingFontSize;
    if (rawSize != null) {
        const size = Number(rawSize);
        // Values below 8 are legacy rem values; convert to pt (1rem ≈ 12pt at default browser zoom).
        const ptSize = size < 8 ? Math.round(size * 12) : size;
        document.documentElement.style.setProperty(
            "--app-font-size",
            `${ptSize}pt`,
        );
    }
}
