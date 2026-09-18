export interface AuthLoginButtonDescriptor {
    providerId: string;
    label: string;
    iconUrl: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
}

const BRAND_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function parseAuthLoginButton(
    value: unknown,
    expectedProviderId?: string,
): AuthLoginButtonDescriptor | null {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const candidate = value as Record<string, unknown>;
    const providerId = String(candidate.providerId ?? "").trim();
    const label = String(candidate.label ?? "").trim();
    const iconUrl = String(candidate.iconUrl ?? "").trim();
    if (
        !providerId ||
        providerId !== (expectedProviderId ?? providerId) ||
        !label ||
        !iconUrl.startsWith("/") ||
        iconUrl.startsWith("//") ||
        iconUrl.includes("\\")
    ) {
        return null;
    }
    const button: AuthLoginButtonDescriptor = {
        providerId,
        label,
        iconUrl,
    };
    for (const field of [
        "backgroundColor",
        "borderColor",
        "textColor",
    ] as const) {
        const fieldValue = candidate[field];
        if (fieldValue === undefined) continue;
        if (
            typeof fieldValue !== "string" ||
            !BRAND_COLOR_PATTERN.test(fieldValue)
        ) {
            return null;
        }
        button[field] = fieldValue;
    }
    return button;
}
