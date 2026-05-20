/**
 * Password policy types and helpers owned by the Auth gateway.
 *
 * Policy configuration is persisted by the auth gateway under its own
 * preference key and is served via /api/v1/auth/password-policy.
 */

export interface PasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigit: boolean;
    requireSpecial: boolean;
}

export const AUTH_PASSWORD_POLICY_KEY = "auth-password-policy";

export function defaultPasswordPolicy(): PasswordPolicy {
    return {
        minLength: 8,
        requireUppercase: false,
        requireLowercase: false,
        requireDigit: false,
        requireSpecial: false,
    };
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
        requireUppercase: policy.requireUppercase === true,
        requireLowercase: policy.requireLowercase === true,
        requireDigit: policy.requireDigit === true,
        requireSpecial: policy.requireSpecial === true,
    };
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
    if (policy.requireUppercase && !/[A-Z]/.test(password))
        return "password_requires_uppercase";
    if (policy.requireLowercase && !/[a-z]/.test(password))
        return "password_requires_lowercase";
    if (policy.requireDigit && !/[0-9]/.test(password))
        return "password_requires_digit";
    if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password))
        return "password_requires_special";
    return null;
}
