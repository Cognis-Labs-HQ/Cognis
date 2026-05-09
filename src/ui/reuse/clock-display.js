/**
 * Reusable clock display and timestamp-formatting helpers.
 *
 * This module centralises common UI helpers for:
 *   - formatting dates/times with explicit fallback strings
 *   - generating digital and analogue clock markup for a timezone
 *   - mounting a live clock that refreshes once per second
 *
 * Public exports:
 *   createDateTimeFormatters(options) — returns date/datetime formatter callbacks with configured fallbacks.
 *   buildDigitalClockMarkup(now, tz)  — returns digital clock markup for the given timezone.
 *   buildAnalogueClockMarkup(now, tz) — returns analogue clock SVG markup for the given timezone.
 *   mountLiveClock(options)           — mounts a ticking clock display and updates timezone label.
 *
 * Usage:
 *   const { formatDateValue, formatDateTimeValue } = createDateTimeFormatters({
 *     dateFallback: i18n.t('ui.app.dashboard.never'),
 *     dateTimeFallback: i18n.t('ui.app.dashboard.never'),
 *   });
 *   mountLiveClock({
 *     displayId: 'dashboard-digital-clock-display',
 *     tzId: 'dashboard-digital-clock-tz',
 *     renderClock: buildDigitalClockMarkup,
 *   });
 *
 * @param {{ dateFallback?: string, dateTimeFallback?: string }} options
 * @returns {{
 *   formatDateValue: (iso: string|null|undefined) => string,
 *   formatDateTimeValue: (iso: string|null|undefined) => string
 * }}
 */
import {
    formatDate,
    formatDateTime,
    getEffectiveTimezone,
} from "./timestamp.js";

export function createDateTimeFormatters({
    dateFallback = "",
    dateTimeFallback = "",
} = {}) {
    return {
        formatDateValue: (iso) => formatDate(iso, dateFallback),
        formatDateTimeValue: (iso) => formatDateTime(iso, dateTimeFallback),
    };
}

/**
 * Resolves hour, minute, and second values in the target timezone for analogue clock rendering.
 *
 * @param {Date} now
 * @param {string} tz
 * @returns {{ hour: number, minute: number, second: number }}
 */
function getClockTimeParts(now, tz) {
    const parts = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
        timeZone: tz,
    }).formatToParts(now);

    return {
        hour:
            parseInt(
                parts.find((part) => part.type === "hour")?.value ?? "0",
                10,
            ) % 12,
        minute: parseInt(
            parts.find((part) => part.type === "minute")?.value ?? "0",
            10,
        ),
        second: parseInt(
            parts.find((part) => part.type === "second")?.value ?? "0",
            10,
        ),
    };
}

/**
 * @param {Date} now
 * @param {string} tz
 * @returns {string}
 */
export function buildAnalogueClockMarkup(now, tz) {
    const { hour, minute, second } = getClockTimeParts(now, tz);
    const centerX = 54;
    const centerY = 54;
    const faceRadius = 48;

    function handCoords(angleDeg, len) {
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        return {
            x: centerX + len * Math.cos(rad),
            y: centerY + len * Math.sin(rad),
        };
    }

    const hourAngle = (hour + minute / 60 + second / 3600) * 30;
    const minuteAngle = (minute + second / 60) * 6;
    const secondAngle = second * 6;
    const hourEnd = handCoords(hourAngle, 28);
    const minuteEnd = handCoords(minuteAngle, 38);
    const secondEnd = handCoords(secondAngle, 44);

    const ticks = Array.from({ length: 60 }, (_, tickIndex) => {
        const major = tickIndex % 5 === 0;
        const tickAngle = (tickIndex * 6 * Math.PI) / 180;
        const inner = major ? faceRadius - 8 : faceRadius - 4;
        const x1 = centerX + faceRadius * Math.cos(tickAngle - Math.PI / 2);
        const y1 = centerY + faceRadius * Math.sin(tickAngle - Math.PI / 2);
        const x2 = centerX + inner * Math.cos(tickAngle - Math.PI / 2);
        const y2 = centerY + inner * Math.sin(tickAngle - Math.PI / 2);
        const tickClass = major
            ? "clock-analogue-tick-major"
            : "clock-analogue-tick";
        return `<line class="${tickClass}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
    }).join("");

    return `<svg class="clock-analogue" width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
      <circle class="clock-analogue-face" cx="${centerX}" cy="${centerY}" r="${faceRadius}"/>
      ${ticks}
      <line class="clock-hand-hour"
        x1="${centerX}" y1="${centerY}" x2="${hourEnd.x.toFixed(2)}" y2="${hourEnd.y.toFixed(2)}"/>
      <line class="clock-hand-minute"
        x1="${centerX}" y1="${centerY}" x2="${minuteEnd.x.toFixed(2)}" y2="${minuteEnd.y.toFixed(2)}"/>
      <line class="clock-hand-second"
        x1="${centerX}" y1="${centerY}" x2="${secondEnd.x.toFixed(2)}" y2="${secondEnd.y.toFixed(2)}"/>
      <circle class="clock-analogue-centre" cx="${centerX}" cy="${centerY}" r="4"/>
    </svg>`;
}

/**
 * @param {Date} now
 * @param {string} tz
 * @returns {string}
 */
export function buildDigitalClockMarkup(now, tz) {
    const timeStr = now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: tz,
    });
    const dateStr = now.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: tz,
    });

    return `
      <div class="clock-digital-stack">
        <span class="clock-digital-time">${timeStr}</span>
        <span class="clock-digital-date">${dateStr}</span>
      </div>
    `;
}

/**
 * @param {{ displayId: string, tzId?: string, renderClock: (now: Date, tz: string) => string }} options
 * @returns {void}
 */
export function mountLiveClock({ displayId, tzId, renderClock }) {
    const displayEl = document.querySelector(`#${displayId}`);
    const tzEl = tzId ? document.querySelector(`#${tzId}`) : null;
    if (!displayEl) return;

    function tick() {
        const timezone = getEffectiveTimezone();
        const now = new Date();
        if (tzEl) tzEl.textContent = timezone;
        displayEl.innerHTML = renderClock(now, timezone);
    }

    tick();
    const intervalId = setInterval(tick, 1000);
    window.addEventListener("pagehide", () => clearInterval(intervalId), {
        once: true,
    });
}
