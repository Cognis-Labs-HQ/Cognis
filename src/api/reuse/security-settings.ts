export interface PasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigit: boolean;
    requireSpecial: boolean;
}

export interface SecuritySettings {
    trustedDomains: string[];
    registrationsEnabled: boolean;
    userValidationMode: "none" | "smtp";
    requireTeacherManualApproval: boolean;
    passwordPolicy: PasswordPolicy;
}

export const SECURITY_SETTINGS_KEY = "security-settings";

export function defaultPasswordPolicy(): PasswordPolicy {
    return {
        minLength: 8,
        requireUppercase: false,
        requireLowercase: false,
        requireDigit: false,
        requireSpecial: false,
    };
}

export function defaultSecuritySettings(): SecuritySettings {
    return {
        trustedDomains: [],
        registrationsEnabled: false,
        userValidationMode: "none",
        requireTeacherManualApproval: true,
        passwordPolicy: defaultPasswordPolicy(),
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

export function normalizeTrustedDomains(rawDomains: unknown): string[] {
    if (!Array.isArray(rawDomains)) return [];
    return Array.from(
        new Set(
            rawDomains
                .filter((entry: unknown) => typeof entry === "string")
                .map((entry: string) =>
                    entry
                        .trim()
                        .toLowerCase()
                        .replace(/^\.+|\.+$/g, ""),
                )
                .filter(Boolean),
        ),
    );
}

export function parseSecuritySettings(
    raw: string | null,
): SecuritySettings | null {
    if (!raw) return defaultSecuritySettings();
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return {
            trustedDomains: normalizeTrustedDomains(parsed.trustedDomains),
            registrationsEnabled:
                typeof parsed.registrationsEnabled === "boolean"
                    ? parsed.registrationsEnabled
                    : false,
            userValidationMode:
                parsed.userValidationMode === "smtp" ? "smtp" : "none",
            requireTeacherManualApproval:
                parsed.requireTeacherManualApproval === false ? false : true,
            passwordPolicy: parsePasswordPolicy(parsed.passwordPolicy),
        };
    } catch {
        return null;
    }
}

export function matchesTrustedDomain(
    candidateDomain: string,
    trustedDomains: string[],
): boolean {
    const normalizedCandidate = candidateDomain
        .trim()
        .toLowerCase()
        .replace(/^\.+|\.+$/g, "");
    if (!normalizedCandidate) return false;
    return normalizeTrustedDomains(trustedDomains).some(
        (trustedDomain) =>
            normalizedCandidate === trustedDomain ||
            normalizedCandidate.endsWith(`.${trustedDomain}`),
    );
}

export function isTrustedHttpUrl(
    urlValue: string,
    {
        baseUrl,
        trustedDomains,
    }: {
        baseUrl: string;
        trustedDomains: string[];
    },
): boolean {
    if (!urlValue) return true;
    try {
        const parsedBaseUrl = new URL(baseUrl);
        const parsedUrl = new URL(urlValue, parsedBaseUrl);
        const hasSafeProtocol =
            parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
        if (!hasSafeProtocol || parsedUrl.username || parsedUrl.password) {
            return false;
        }
        if (parsedUrl.origin === parsedBaseUrl.origin) {
            return true;
        }
        return matchesTrustedDomain(parsedUrl.hostname, trustedDomains);
    } catch {
        return false;
    }
}
