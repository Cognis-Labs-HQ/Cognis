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
 *   formatDate(iso, fallback)             — formats an ISO string as a localised date (no time).
 *   formatTime(iso, fallback, opts)       — formats an ISO string as a localised time while
 *                                           respecting the user's 12/24-hour preference.
 *   formatDateTime(iso, fallback, opts)   — formats an ISO string as a localised date + time.
 *   formatMonthYear(iso, fallback)        — formats an ISO value as a localised month and year.
 *   formatRelativeTime(epochMs, fallback) — formats a past epoch timestamp as a relative
 *                                           locale-aware string, e.g. "5 minutes ago".
 *   getBrowserDetectedTimezone()          — returns the browser-detected IANA timezone string.
 *   getEffectiveTimezone()                — returns the IANA timezone string currently in use.
 *   getEffectiveTimeFormat()              — returns 'auto', '12h', or '24h'.
 *   applyTimezoneToLocalStorage(tz, det)  — writes the effective timezone to cognis_timezone;
 *                                           pass the saved preference and the detected fallback.
 *   applyTimeFormatToLocalStorage(value)  — persists the active 12/24-hour preference.
 *   syncTimezoneOnLogin(username)         — reads saved preferences after login; when timezone is
 *                                           "auto" (or unset), detects the browser timezone,
 *                                           persists it, and writes cognis_timezone to localStorage.
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
import { captureAccountGuard } from "./offline-identity.js";

const TIMEZONE_STORAGE_KEY = "cognis_timezone";
const TIME_FORMAT_STORAGE_KEY = "cognis_time_format";

function resolveHour12Preference() {
    const timeFormat = getEffectiveTimeFormat();
    if (timeFormat === "12h") return true;
    if (timeFormat === "24h") return false;
    return undefined;
}

function buildTimeFormatOptions(options = {}) {
    const {
        includeSeconds = false,
        timeZone = getEffectiveTimezone(),
        ...rest
    } = options;
    const hour12 = resolveHour12Preference();
    return {
        hour: "numeric",
        minute: "2-digit",
        ...(includeSeconds ? { second: "2-digit" } : {}),
        ...rest,
        ...(hour12 == null ? {} : { hour12 }),
        timeZone,
    };
}

function detectBrowserTimezone() {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
        return "UTC";
    }
}

export function applyTimezoneToLocalStorage(savedTimezone, detectedTimezone) {
    if (savedTimezone && savedTimezone !== "auto") {
        localStorage.setItem(TIMEZONE_STORAGE_KEY, savedTimezone);
    } else if (detectedTimezone) {
        localStorage.setItem(TIMEZONE_STORAGE_KEY, detectedTimezone);
    } else {
        localStorage.removeItem(TIMEZONE_STORAGE_KEY);
    }
}

export function applyTimeFormatToLocalStorage(value) {
    if (value === "12h" || value === "24h") {
        localStorage.setItem(TIME_FORMAT_STORAGE_KEY, value);
        return;
    }
    localStorage.removeItem(TIME_FORMAT_STORAGE_KEY);
}

export function getEffectiveTimezone() {
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (stored) return stored;
    return detectBrowserTimezone();
}

export function getEffectiveTimeFormat() {
    const stored = localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
    if (stored === "12h" || stored === "24h") {
        return stored;
    }
    return "auto";
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

export function formatTime(iso, fallback = "", options = {}) {
    if (!iso) return fallback;
    try {
        return new Date(iso).toLocaleTimeString(
            undefined,
            buildTimeFormatOptions(options),
        );
    } catch {
        return iso;
    }
}

export function formatDateTime(iso, fallback = "", options = {}) {
    if (!iso) return fallback;
    try {
        const hour12 = resolveHour12Preference();
        return new Date(iso).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: options.includeSeconds ? "medium" : "short",
            ...(hour12 == null ? {} : { hour12 }),
            timeZone: getEffectiveTimezone(),
        });
    } catch {
        return iso;
    }
}

export function formatMonthYear(iso, fallback = "") {
    if (!iso) return fallback;
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            timeZone: getEffectiveTimezone(),
        });
    } catch {
        return fallback || String(iso);
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
let cachedRelativeTimeFormatter;
export function formatRelativeTime(epochMilliseconds, fallback = "") {
    if (!epochMilliseconds) return fallback;
    try {
        cachedRelativeTimeFormatter ??= new Intl.RelativeTimeFormat(undefined, {
            numeric: "auto",
        });
        const differenceMilliseconds = epochMilliseconds - Date.now();
        const absDifference = Math.abs(differenceMilliseconds);
        if (absDifference < 60_000) {
            return cachedRelativeTimeFormatter.format(
                Math.round(differenceMilliseconds / 1000),
                "second",
            );
        }
        if (absDifference < 3_600_000) {
            return cachedRelativeTimeFormatter.format(
                Math.round(differenceMilliseconds / 60_000),
                "minute",
            );
        }
        if (absDifference < 86_400_000) {
            return cachedRelativeTimeFormatter.format(
                Math.round(differenceMilliseconds / 3_600_000),
                "hour",
            );
        }
        if (absDifference < 30 * 86_400_000) {
            return cachedRelativeTimeFormatter.format(
                Math.round(differenceMilliseconds / 86_400_000),
                "day",
            );
        }
        if (absDifference < 365 * 86_400_000) {
            return cachedRelativeTimeFormatter.format(
                Math.round(differenceMilliseconds / (30 * 86_400_000)),
                "month",
            );
        }
        return cachedRelativeTimeFormatter.format(
            Math.round(differenceMilliseconds / (365 * 86_400_000)),
            "year",
        );
    } catch {
        return fallback;
    }
}

export async function syncTimezoneOnLogin(username) {
    if (!username || username !== localStorage.getItem("cognis_account"))
        return;
    const assertAccount = captureAccountGuard();
    try {
        const preferences = await loadUiPreferences();
        assertAccount();
        const savedTimezone = preferences?.timezone;

        applyTimeFormatToLocalStorage(preferences?.timeFormat);

        if (savedTimezone && savedTimezone !== "auto") {
            applyTimezoneToLocalStorage(savedTimezone, null);
            return;
        }

        const detected = detectBrowserTimezone();
        applyTimezoneToLocalStorage(null, detected);

        if (preferences?.detectedTimezone !== detected) {
            await saveUiPreferences(
                { detectedTimezone: detected },
                { bufferOffline: false },
            );
        }
    } catch {
        assertAccount();
        applyTimezoneToLocalStorage(null, detectBrowserTimezone());
    }
}
