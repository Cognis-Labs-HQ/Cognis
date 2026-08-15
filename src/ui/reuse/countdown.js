/**
 * Formats remaining durations for live countdown displays.
 *
 * Public exports:
 * - `formatCountdown` — renders milliseconds as zero-padded hours, minutes, and seconds.
 *
 * @example
 * formatCountdown(3_661_000); // "01:01:01"
 */

/**
 * Formats a remaining duration as `HH:MM:SS`.
 *
 * @param {number} milliseconds - Remaining duration in milliseconds.
 * @returns {string} Zero-padded countdown text.
 */
export function formatCountdown(milliseconds) {
    if (milliseconds <= 0) return "00:00:00";
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
}
