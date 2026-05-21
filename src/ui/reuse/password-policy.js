/**
 * Password-policy helpers for browser-side UI modules.
 *
 * Normalizes password policy payloads from API responses so register/settings
 * pages can share one parsing rule set, and provides reusable character-count
 * matching for count-based criteria checks.
 *
 * Public exports:
 *   DEFAULT_PASSWORD_POLICY — shared default browser-side password policy.
 *   normalizePasswordPolicy(raw, fallbackPolicy) — parses a raw API payload
 *     into a safe password-policy object.
 *   countPatternMatches(value, pattern) — returns the number of regex matches.
 *
 * Usage:
 *   const policy = normalizePasswordPolicy(payload.data, {
 *     minLength: 8,
 *     requireUppercase: 0,
 *     requireLowercase: false,
 *     requireDigit: 0,
 *     requireSpecial: 0,
 *   });
 *   const uppercaseCount = countPatternMatches('AbC', /[A-Z]/g);
 *
 * @param {unknown} raw
 * @param {{ minLength: number, requireUppercase: number, requireLowercase: boolean, requireDigit: number, requireSpecial: number }} fallbackPolicy
 * @returns {{ minLength: number, requireUppercase: number, requireLowercase: boolean, requireDigit: number, requireSpecial: number }}
 */
export const DEFAULT_PASSWORD_POLICY = Object.freeze({
    minLength: 8,
    requireUppercase: 0,
    requireLowercase: false,
    requireDigit: 0,
    requireSpecial: 0,
});

export function normalizePasswordPolicy(raw, fallbackPolicy) {
    const defaults = { ...DEFAULT_PASSWORD_POLICY, ...(fallbackPolicy ?? {}) };
    if (!raw || typeof raw !== 'object') {
        return { ...defaults };
    }
    return {
        minLength:
            typeof raw.minLength === 'number' && raw.minLength >= 1
                ? Math.floor(raw.minLength)
                : defaults.minLength,
        requireUppercase:
            typeof raw.requireUppercase === 'number' && raw.requireUppercase >= 0
                ? Math.floor(raw.requireUppercase)
                : defaults.requireUppercase,
        requireLowercase: raw.requireLowercase === true,
        requireDigit:
            typeof raw.requireDigit === 'number' && raw.requireDigit >= 0
                ? Math.floor(raw.requireDigit)
                : defaults.requireDigit,
        requireSpecial:
            typeof raw.requireSpecial === 'number' && raw.requireSpecial >= 0
                ? Math.floor(raw.requireSpecial)
                : defaults.requireSpecial,
    };
}

/**
 * Counts matches for a global regular expression.
 *
 * @param {string} value
 * @param {RegExp} pattern
 * @returns {number}
 */
export function countPatternMatches(value, pattern) {
    if (typeof value !== 'string') {
        return 0;
    }
    return (value.match(pattern) ?? []).length;
}
