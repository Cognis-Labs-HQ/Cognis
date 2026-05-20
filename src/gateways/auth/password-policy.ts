/**
 * Password policy types and helpers owned by the Auth gateway.
 *
 * Policy configuration is persisted by the auth gateway under its own
 * preference key and is served via /api/v1/auth/password-policy.
 *
 * requireUppercase, requireDigit, and requireSpecial are counts: 0 disables
 * the requirement, a positive integer sets the minimum number of characters
 * of that class that the password must contain.
 */

export interface PasswordPolicy {
    minLength: number;
    requireUppercase: number;
    requireLowercase: boolean;
    requireDigit: number;
    requireSpecial: number;
}

export const AUTH_PASSWORD_POLICY_KEY = "auth-password-policy";

export function defaultPasswordPolicy(): PasswordPolicy {
    return {
        minLength: 8,
        requireUppercase: 0,
        requireLowercase: false,
        requireDigit: 0,
        requireSpecial: 0,
    };
}

function parseCountField(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return Math.floor(value);
    }
    return 0;
}

export function parsePasswordPolicy(raw: unknown): PasswordPolicy {
    const defaults = defaultPasswordPolicy();
    if (!raw || typeof raw !== "object") return defaults;
    const policy = raw as Record<string, unknown>;
    const minLength =
        typeof policy.minLength === "number" &&
        policy.minLength >= 1 &&
        policy.minLength <= 128
            ? Math.floor(policy.minLength)
            : defaults.minLength;
    return {
        minLength,
        requireUppercase: parseCountField(policy.requireUppercase),
        requireLowercase: policy.requireLowercase === true,
        requireDigit: parseCountField(policy.requireDigit),
        requireSpecial: parseCountField(policy.requireSpecial),
    };
}

/**
 * Counts non-overlapping occurrences of characters matching the given regex
 * character class within the password string.
 */
function countMatches(password: string, pattern: RegExp): number {
    return (password.match(pattern) ?? []).length;
}

/**
 * Checks whether a password satisfies a given policy.
 * Returns null when valid, or an error code string when invalid.
 */
export function checkPasswordPolicy(
    password: string,
    policy: PasswordPolicy,
): string | null {
    if (password.length < policy.minLength)
        return `password_too_short:${policy.minLength}`;
    if (
        policy.requireUppercase > 0 &&
        countMatches(password, /[A-Z]/g) < policy.requireUppercase
    )
        return `password_requires_uppercase:${policy.requireUppercase}`;
    if (policy.requireLowercase && !/[a-z]/.test(password))
        return "password_requires_lowercase";
    if (
        policy.requireDigit > 0 &&
        countMatches(password, /[0-9]/g) < policy.requireDigit
    )
        return `password_requires_digit:${policy.requireDigit}`;
    if (
        policy.requireSpecial > 0 &&
        countMatches(password, /[^A-Za-z0-9]/g) < policy.requireSpecial
    )
        return `password_requires_special:${policy.requireSpecial}`;
    return null;
}
