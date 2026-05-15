export interface SecuritySettings {
    trustedDomains: string[];
    registrationsEnabled: boolean;
    userValidationMode: "none" | "smtp";
    requireTeacherManualApproval: boolean;
}

export const SECURITY_SETTINGS_KEY = "security-settings";

export function defaultSecuritySettings(): SecuritySettings {
    return {
        trustedDomains: [],
        registrationsEnabled: false,
        userValidationMode: "none",
        requireTeacherManualApproval: true,
    };
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
