/**
 * Converts minute-based settings to and from a numeric field with a unit selector.
 *
 * Public exports:
 * - `DURATION_UNITS` — supported unit identifiers and their minute multipliers.
 * - `splitDurationMinutes` — chooses a concise exact unit/value pair.
 * - `joinDurationMinutes` — converts a value and unit back to minutes.
 * - `getDurationUnitLimits` — lists units and numeric maxima within a duration.
 *
 * @example
 * const { value, unit } = splitDurationMinutes(120); // { value: 2, unit: "hours" }
 * joinDurationMinutes(value, unit); // 120
 */

export const DURATION_UNITS = Object.freeze({
    minutes: 1,
    hours: 60,
    days: 1440,
    weeks: 10080,
});

/**
 * Chooses the largest unit that represents a duration without a fraction.
 *
 * @param {number} minutes - Positive duration expressed in whole minutes.
 * @returns {{ value: number, unit: keyof DURATION_UNITS }} Exact display value and unit.
 */
export function splitDurationMinutes(minutes) {
    for (const unit of ["weeks", "days", "hours"]) {
        const multiplier = DURATION_UNITS[unit];
        if (minutes >= multiplier && minutes % multiplier === 0) {
            return { value: minutes / multiplier, unit };
        }
    }
    return { value: minutes, unit: "minutes" };
}

/**
 * Converts a positive whole-number value and supported unit to minutes.
 *
 * @param {number|string} value - Numeric field value.
 * @param {string} unit - A key from `DURATION_UNITS`.
 * @returns {number} Duration in minutes, or `NaN` for invalid input.
 */
export function joinDurationMinutes(value, unit) {
    const number = Number(value);
    const multiplier = DURATION_UNITS[unit];
    return Number.isInteger(number) && number >= 1 && multiplier
        ? number * multiplier
        : Number.NaN;
}

/**
 * Lists selectable units and the greatest whole value that fits a duration.
 *
 * @param {number} maximumMinutes - Positive maximum duration in whole minutes.
 * @returns {Array<{ unit: keyof DURATION_UNITS, max: number }>} Eligible units and maxima.
 */
export function getDurationUnitLimits(maximumMinutes) {
    if (!Number.isInteger(maximumMinutes) || maximumMinutes < 1) {
        return [];
    }
    return Object.entries(DURATION_UNITS)
        .filter(([, multiplier]) => multiplier <= maximumMinutes)
        .map(([unit, multiplier]) => ({
            unit,
            max: Math.floor(maximumMinutes / multiplier),
        }));
}
