/**
 * Timestamp formatting utilities with user-timezone awareness.
 *
 * All timestamps rendered in the UI should pipe through this module so that
 * dates and times are always shown in the user's preferred timezone.  The
 * effective timezone is resolved in the following priority order:
 *
 *   1. A specific IANA timezone the user has saved (e.g. "America/New_York").
 *   2. A browser-detected timezone that was cached during their last login.
 *   3. Live browser detection via Intl.DateTimeFormat().
 *
 * Public exports:
 *   formatDate(iso, fallback)            — formats an ISO string as a localised date (no time).
 *   formatDateTime(iso, fallback, opts)  — formats an ISO string as a localised date + time.
 *   formatRelativeTime(epochMs, fallback) — formats a past epoch timestamp as a relative
 *                                          locale-aware string, e.g. "5 minutes ago".
 *   getBrowserDetectedTimezone()         — returns the browser-detected IANA timezone string.
 *   getEffectiveTimezone()               — returns the IANA timezone string currently in use.
 *   applyTimezoneToLocalStorage(tz, det) — writes the effective timezone to cognis_timezone;
 *                                          pass the saved preference and the detected fallback.
 *   syncTimezoneOnLogin(username)        — reads saved preferences after login; when timezone is
 *                                          "auto" (or unset), detects the browser timezone,
 *                                          persists it, and writes cognis_timezone to localStorage.
 *
 * Usage:
 *   import { formatDate, formatDateTime, formatRelativeTime, syncTimezoneOnLogin } from '../reuse/timestamp.js';
 *
 *   const label = formatDate('2024-03-15T08:00:00Z');
 *   const label = formatDateTime('2024-03-15T08:00:00Z');
 *   const precise = formatDateTime('2024-03-15T08:00:00Z', '', { includeSeconds: true });
 *   const ago = formatRelativeTime(Date.now() - 300_000); // "5 minutes ago"
 *   await syncTimezoneOnLogin(body.data.accountId);
 *
 * @param {string} iso      — ISO 8601 date/datetime string, e.g. "2024-03-15T08:00:00Z".
 * @param {string} fallback — returned as-is when iso is falsy.
 * @param {{ includeSeconds?: boolean }} options — optional formatting flags.
 * @returns {string}
 */
import { loadUiPreferences, saveUiPreferences } from "./ui-preferences.js";

const STORAGE_KEY = "cognis_timezone";

function detectBrowserTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
}

export function applyTimezoneToLocalStorage(savedTz, detectedTz) {
    if (savedTz && savedTz !== "auto") {
        localStorage.setItem(STORAGE_KEY, savedTz);
    } else if (detectedTz) {
        localStorage.setItem(STORAGE_KEY, detectedTz);
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
}

export function getEffectiveTimezone() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    return detectBrowserTimezone();
}

export function getBrowserDetectedTimezone() {
    return detectBrowserTimezone();
}

export function formatDate(iso, fallback = "") {
    if (!iso) return fallback;
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: getEffectiveTimezone(),
        });
    } catch {
        return iso;
    }
}

export function formatDateTime(iso, fallback = "", options = {}) {
    if (!iso) return fallback;
    try {
        return new Date(iso).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: options.includeSeconds ? "medium" : "short",
            timeZone: getEffectiveTimezone(),
        });
    } catch {
        return iso;
    }
}

/**
 * Formats a past epoch timestamp as a locale-aware relative time string,
 * e.g. "5 minutes ago", "2 hours ago", "yesterday".
 *
 * Uses Intl.RelativeTimeFormat so the output respects the user's browser locale
 * without requiring custom translation strings.
 *
 * @param {number} epochMs — Unix timestamp in milliseconds.
 * @param {string} fallback — Returned when epochMs is falsy or formatting fails.
 * @returns {string}
 */
let _rtf;
export function formatRelativeTime(epochMs, fallback = "") {
    if (!epochMs) return fallback;
    try {
        _rtf ??= new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
        const diffMs = epochMs - Date.now();
        const absDiff = Math.abs(diffMs);
        if (absDiff < 60_000) {
            return rtf.format(Math.round(diffMs / 1000), "second");
        }
        if (absDiff < 3_600_000) {
            return rtf.format(Math.round(diffMs / 60_000), "minute");
        }
        if (absDiff < 86_400_000) {
            return rtf.format(Math.round(diffMs / 3_600_000), "hour");
        }
        if (absDiff < 30 * 86_400_000) {
            return rtf.format(Math.round(diffMs / 86_400_000), "day");
        }
        if (absDiff < 365 * 86_400_000) {
            return rtf.format(Math.round(diffMs / (30 * 86_400_000)), "month");
        }
        return rtf.format(Math.round(diffMs / (365 * 86_400_000)), "year");
    } catch {
        return fallback;
    }
}

export async function syncTimezoneOnLogin(username) {
    if (!username) return;
    try {
        const prefs = await loadUiPreferences();
        const savedTz = prefs?.timezone;

        if (savedTz && savedTz !== "auto") {
            applyTimezoneToLocalStorage(savedTz, null);
            return;
        }

        const detected = detectBrowserTimezone();
        applyTimezoneToLocalStorage(null, detected);

        if (prefs?.detectedTimezone !== detected) {
            await saveUiPreferences({ detectedTimezone: detected });
        }
    } catch {
        applyTimezoneToLocalStorage(null, detectBrowserTimezone());
    }
}
