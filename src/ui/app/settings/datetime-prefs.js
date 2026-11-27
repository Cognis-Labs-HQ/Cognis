import { getBrowserDetectedTimezone } from "../../reuse/timestamp.js";

/**
 * Date and time preferences sub-module for the Settings page.
 *
 * Renders a timezone selector that lets the user choose between automatic
 * browser-based timezone detection and a specific IANA timezone.  When "auto"
 * is selected the browser timezone is re-detected on every login.  When a
 * specific timezone is chosen it overrides auto-detection permanently.
 *
 * Public exports:
 *   initDateTimePrefs(root, options) — initialises the timezone selector inside root.
 *
 * Usage:
 *   const dtPrefs = initDateTimePrefs(root, { existingPrefs, i18n, onDirtyChange });
 *   await dtPrefs.init();
 *   const tz = dtPrefs.getTimezone();  // 'auto' | IANA string
 *   const timeFormat = dtPrefs.getTimeFormat(); // 'auto' | '12h' | '24h'
 *
 * @param {Element} root
 * @param {{ existingPrefs: object|null, i18n: object, onDirtyChange?: (dirty: boolean) => void }} options
 * @returns {{ init: () => void, getTimezone: () => string, getTimeFormat: () => string, isDirty: () => boolean, commit: () => void, discard: () => void }}
 */
function initDateTimePreferences(
    root,
    { existingPrefs: existingPreferences, i18n, onDirtyChange },
) {
    let savedTimezone = existingPreferences?.timezone ?? "auto";
    let currentTimezone = savedTimezone;
    let savedTimeFormat = existingPreferences?.timeFormat ?? "auto";
    let currentTimeFormat = savedTimeFormat;

    function notifyDirty() {
        onDirtyChange?.(
            currentTimezone !== savedTimezone ||
                currentTimeFormat !== savedTimeFormat,
        );
    }

    /**
     * Builds timezone choices for the settings selector.
     *
     * Uses `Intl.supportedValuesOf('timeZone')` when available. If unavailable,
     * falls back to a minimal deduplicated list derived from the current
     * selected timezone, the browser-detected timezone, and UTC.
     *
     * @param {{ detectedTimezone: string, selectedTimezone: string }} options
     * @returns {string[]}
     */
    function buildTimezoneOptions({ detectedTimezone, selectedTimezone }) {
        let zones = [];
        try {
            if (typeof Intl.supportedValuesOf === "function") {
                zones = Intl.supportedValuesOf("timeZone");
            }
        } catch {
            zones = [];
        }

        if (!zones.length) {
            const fallback = [selectedTimezone, detectedTimezone, "UTC"].filter(
                (zone) => zone && zone !== "auto",
            );
            return [...new Set(fallback)];
        }

        if (
            selectedTimezone &&
            selectedTimezone !== "auto" &&
            !zones.includes(selectedTimezone)
        ) {
            zones = [...zones, selectedTimezone];
        }

        return [...new Set([...zones, "UTC"])];
    }

    function initialize() {
        const timezoneSelect = root.querySelector("#pref-timezone-select");
        const timeFormatSelect = root.querySelector("#pref-time-format-select");
        if (!timezoneSelect || !timeFormatSelect) return;

        const effectiveTimezone = getBrowserDetectedTimezone();
        const autoLabel = i18n
            .t("ui.app.settings.datetime_tz_auto")
            .replace("{tz}", effectiveTimezone);

        const autoOption = document.createElement("option");
        autoOption.value = "auto";
        autoOption.textContent = autoLabel;
        timezoneSelect.append(autoOption);

        const zones = buildTimezoneOptions({
            detectedTimezone: effectiveTimezone,
            selectedTimezone: currentTimezone,
        });
        zones.forEach((timeZone) => {
            const option = document.createElement("option");
            option.value = timeZone;
            option.textContent = timeZone;
            timezoneSelect.append(option);
        });

        timezoneSelect.value = currentTimezone;
        [
            ["auto", i18n.t("ui.app.settings.datetime_time_format_auto")],
            ["12h", i18n.t("ui.app.settings.datetime_time_format_12h")],
            ["24h", i18n.t("ui.app.settings.datetime_time_format_24h")],
        ].forEach(([value, label]) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            timeFormatSelect.append(option);
        });
        timeFormatSelect.value = currentTimeFormat;

        timezoneSelect.addEventListener("change", () => {
            currentTimezone = timezoneSelect.value;
            notifyDirty();
        });
        timeFormatSelect.addEventListener("change", () => {
            currentTimeFormat = timeFormatSelect.value;
            notifyDirty();
        });
    }

    function commit() {
        savedTimezone = currentTimezone;
        savedTimeFormat = currentTimeFormat;
    }

    function discard() {
        currentTimezone = savedTimezone;
        currentTimeFormat = savedTimeFormat;
        const timezoneSelect = root.querySelector("#pref-timezone-select");
        const timeFormatSelect = root.querySelector("#pref-time-format-select");
        if (timezoneSelect) timezoneSelect.value = savedTimezone;
        if (timeFormatSelect) timeFormatSelect.value = savedTimeFormat;
        notifyDirty();
    }

    return {
        init: initialize,
        getTimezone: () => currentTimezone,
        getTimeFormat: () => currentTimeFormat,
        isDirty: () =>
            currentTimezone !== savedTimezone ||
            currentTimeFormat !== savedTimeFormat,
        commit,
        discard,
    };
}
export { initDateTimePreferences as initDateTimePrefs };
