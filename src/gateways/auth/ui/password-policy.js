export const DEFAULT_PASSWORD_POLICY = Object.freeze({
    minLength: 8,
    requireUppercase: 0,
    requireLowercase: 0,
    requireDigit: 0,
    requireSpecial: 0,
});

/**
 * Parses a count-based password-policy field.
 *
 * @param {unknown} rawValue
 * @param {number} minimumValue
 * @param {number} fallbackValue
 * @returns {number}
 */
export function parsePolicyCount(rawValue, minimumValue, fallbackValue) {
    const parsedValue = Number.parseInt(String(rawValue ?? ""), 10);
    if (Number.isNaN(parsedValue) || parsedValue < minimumValue) {
        return fallbackValue;
    }
    return parsedValue;
}

/**
 * Normalizes a raw password-policy payload into numeric count fields and a
 * bounded minimum length.
 *
 * @param {unknown} raw
 * @param {{ minLength: number, requireUppercase: number, requireLowercase: number, requireDigit: number, requireSpecial: number }} fallbackPolicy
 * @returns {{ minLength: number, requireUppercase: number, requireLowercase: number, requireDigit: number, requireSpecial: number }}
 */
export function normalizePasswordPolicy(raw, fallbackPolicy) {
    const defaults = { ...DEFAULT_PASSWORD_POLICY, ...(fallbackPolicy ?? {}) };
    if (!raw || typeof raw !== "object") return { ...defaults };
    const fields = [
        { key: "minLength", min: 1 },
        { key: "requireUppercase", min: 0 },
        { key: "requireLowercase", min: 0 },
        { key: "requireDigit", min: 0 },
        { key: "requireSpecial", min: 0 },
    ];
    return Object.fromEntries(
        fields.map(({ key, min }) => [
            key,
            typeof raw[key] === "number" && raw[key] >= min
                ? Math.floor(raw[key])
                : defaults[key],
        ]),
    );
}

/**
 * Counts matches for a global regular expression.
 *
 * @param {string} value
 * @param {RegExp} pattern
 * @returns {number}
 */
export function countPatternMatches(value, pattern) {
    if (typeof value !== "string") return 0;
    return (value.match(pattern) ?? []).length;
}
