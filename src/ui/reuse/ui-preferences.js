/**
 * Loads and applies persisted UI preferences (font, size, message style).
 *
 * - loadUiPreferences()       — fetches the current account's ui-preferences from the API.
 *                               Returns the parsed prefs object or null on failure.
 * - saveUiPreferences(patch)  — merges and persists account UI preferences.
 * - applyUiPreferences(prefs) — writes message-style + font CSS custom properties onto <html>
 *                               immediately (legacy rem values are converted to pt).
 *
 * Usage:
 *   const prefs = await loadUiPreferences();
 *   applyUiPreferences(prefs);
 *   await saveUiPreferences({ font: 'system-ui' });
 */
import { offlineEnabled } from "./offline-state.js";
import { uiCtx } from "./ui-ctx.js";
import { captureAccountGuard } from "./offline-identity.js";
import { apiFetch } from "./api-client.js";
import { normalizeMessageStyle } from "./message-style-options.js";

function preferenceRequest(path, options) {
    const request = uiCtx.capabilities.get("social:profileRequest") ?? apiFetch;
    return request(path, options);
}

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
        const response = await preferenceRequest(
            `/api/v1/social/users/${encodeURIComponent(account)}/preferences/ui-preferences`,
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
    const assertAccount = captureAccountGuard();
    const current = await loadUiPreferences();
    assertAccount();
    const merged = { ...(current || {}), ...patch };
    const response = await preferenceRequest(
        `/api/v1/social/users/${encodeURIComponent(account)}/preferences/ui-preferences`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ layout: merged }),
        },
    );
    if (!response.ok) {
        throw new Error(`ui_preferences_save_failed:${response.status}`);
    }
}

export function applyUiPreferences(prefs) {
    if (prefs) {
        const previousEnabled = offlineEnabled();
        const previousOwner = localStorage.getItem(
            "cognis_offline_preference_account",
        );
        const account = localStorage.getItem("cognis_account") ?? "";
        localStorage.setItem("cognis_ui_preferences", JSON.stringify(prefs));
        localStorage.setItem("cognis_offline_preference_account", account);
        if (
            previousEnabled !== (prefs.offlineEnabled !== false) ||
            previousOwner !== account
        )
            window.dispatchEvent(
                new CustomEvent("cognis:offline-preference-changed"),
            );
    }
    const messageStyle = normalizeMessageStyle(prefs?.messageStyle);
    document.documentElement.dataset.messageStyle = messageStyle;
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
