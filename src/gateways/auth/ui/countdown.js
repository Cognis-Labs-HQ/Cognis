/**
 * Converts remaining session and invitation durations into display values.
 *
 * Public exports:
 * - `formatCountdownClock` — renders milliseconds as an HH:MM:SS clock.
 * - `getCountdownParts` — splits milliseconds into non-zero week-to-second parts.
 * - `getCountdownUrgencyThresholds` — balances urgency windows for short and long sessions.
 * - `getCountdownUrgency` — resolves warning state from the remaining duration.
 *
 * @example
 * formatCountdownClock(3_661_000); // "01:01:01"
 * getCountdownParts(90_061_000); // [{ unit: "days", value: 1 }, ...]
 */

/**
 * Formats a remaining duration as `HH:MM:SS`.
 *
 * @param {number} milliseconds - Remaining duration in milliseconds.
 * @returns {string} Zero-padded countdown text.
 */
export function formatCountdownClock(milliseconds) {
    if (milliseconds <= 0) return "00:00:00";
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
}

/**
 * Splits a remaining duration into non-zero calendar-style units.
 *
 * @param {number} milliseconds - Remaining duration in milliseconds.
 * @returns {Array<{ unit: "weeks"|"days"|"hours"|"minutes"|"seconds", value: number }>} Ordered countdown parts.
 */
export function getCountdownParts(milliseconds) {
    let remainingSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const units = [
        ["weeks", 604800],
        ["days", 86400],
        ["hours", 3600],
        ["minutes", 60],
        ["seconds", 1],
    ];
    const parts = [];
    for (const [unit, seconds] of units) {
        const value = Math.floor(remainingSeconds / seconds);
        remainingSeconds %= seconds;
        if (value > 0 || (unit === "seconds" && parts.length === 0)) {
            parts.push({ unit, value });
        }
    }
    return parts;
}

/**
 * Calculates bounded urgency windows for a session duration.
 *
 * @param {number} durationMilliseconds - Full issued-session duration.
 * @returns {{ warningMilliseconds: number, dangerMilliseconds: number }} Urgency thresholds.
 */
export function getCountdownUrgencyThresholds(durationMilliseconds) {
    const warningMilliseconds = Math.min(
        Math.max(durationMilliseconds * 0.1, 30_000),
        86_400_000,
        durationMilliseconds * 0.5,
    );
    const dangerMilliseconds = Math.min(
        Math.max(durationMilliseconds * 0.02, 10_000),
        3_600_000,
        durationMilliseconds * 0.2,
    );
    return { warningMilliseconds, dangerMilliseconds };
}

/**
 * Resolves the urgency state for a live session countdown.
 *
 * @param {number} remainingMilliseconds - Current time remaining.
 * @param {number} durationMilliseconds - Full issued-session duration.
 * @returns {"normal"|"warning"|"danger"} Current countdown urgency.
 */
export function getCountdownUrgency(
    remainingMilliseconds,
    durationMilliseconds,
) {
    const { warningMilliseconds, dangerMilliseconds } =
        getCountdownUrgencyThresholds(durationMilliseconds);
    if (remainingMilliseconds <= dangerMilliseconds) return "danger";
    if (remainingMilliseconds <= warningMilliseconds) return "warning";
    return "normal";
}
