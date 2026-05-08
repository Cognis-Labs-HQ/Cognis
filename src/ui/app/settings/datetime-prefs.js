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
 *
 * @param {Element} root
 * @param {{ existingPrefs: object|null, i18n: object, onDirtyChange?: (dirty: boolean) => void }} options
 * @returns {{ init: () => void, getTimezone: () => string, isDirty: () => boolean, discard: () => void }}
 */
export function initDateTimePrefs(
    root,
    { existingPrefs, i18n, onDirtyChange },
) {
    const savedTimezone = existingPrefs?.timezone ?? "auto";
    let currentTimezone = savedTimezone;

    function notifyDirty() {
        onDirtyChange?.(currentTimezone !== savedTimezone);
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

        return zones;
    }

    function init() {
        const selectEl = root.querySelector("#pref-timezone-select");
        if (!selectEl) return;

        const effectiveTz = getBrowserDetectedTimezone();
        const autoLabel = i18n
            .t("ui.app.settings.datetime_tz_auto")
            .replace("{tz}", effectiveTz);

        const autoOption = document.createElement("option");
        autoOption.value = "auto";
        autoOption.textContent = autoLabel;
        selectEl.append(autoOption);

        const zones = buildTimezoneOptions({
            detectedTimezone: effectiveTz,
            selectedTimezone: currentTimezone,
        });
        zones.forEach((tz) => {
            const opt = document.createElement("option");
            opt.value = tz;
            opt.textContent = tz;
            selectEl.append(opt);
        });

        selectEl.value = currentTimezone;

        selectEl.addEventListener("change", () => {
            currentTimezone = selectEl.value;
            notifyDirty();
        });
    }

    function discard() {
        currentTimezone = savedTimezone;
        const selectEl = root.querySelector("#pref-timezone-select");
        if (selectEl) selectEl.value = savedTimezone;
        notifyDirty();
    }

    return {
        init,
        getTimezone: () => currentTimezone,
        isDirty: () => currentTimezone !== savedTimezone,
        discard,
    };
}
