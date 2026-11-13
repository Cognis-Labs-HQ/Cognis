import type {
    ShareAccessControls,
    SharePermission,
    ShareRecipient,
} from "./types.js";

export function normalizeOptionalString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized || null;
}

export function normalizePermissions(value: unknown): SharePermission[] {
    const entries = Array.isArray(value) ? value : ["read"];
    const permissions = new Set<SharePermission>();
    for (const entry of entries) {
        const normalized = String(entry ?? "").trim();
        if (normalized === "read" || normalized === "write")
            permissions.add(normalized);
    }
    if (permissions.size === 0) permissions.add("read");
    if (permissions.has("write")) permissions.add("read");
    return Array.from(permissions).sort();
}

export function normalizeRecipients(value: unknown): ShareRecipient[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const candidate = entry as Record<string, unknown>;
        const type = String(candidate.type ?? "").trim();
        const id = String(candidate.id ?? "").trim();
        if ((type !== "user" && type !== "group" && type !== "email") || !id)
            return [];
        return [
            {
                type,
                id,
                label: normalizeOptionalString(candidate.label),
                handle: normalizeOptionalString(candidate.handle),
                avatarKey: normalizeOptionalString(candidate.avatarKey),
                permissions: normalizePermissions(candidate.permissions),
            },
        ];
    });
}

export function normalizeAccessControls(value: unknown): ShareAccessControls {
    const candidate =
        value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
    const permissions = normalizePermissions(candidate.permissions);
    return {
        permissions,
        recipients: normalizeRecipients(candidate.recipients),
        passwordProtected: candidate.passwordProtected === true,
        watermarkReadonly:
            candidate.watermarkReadonly === true ||
            (permissions.includes("read") && !permissions.includes("write")),
    };
}

export function parseJsonObject(
    value: unknown,
): Record<string, unknown> | null {
    try {
        const parsed = value ? JSON.parse(String(value)) : null;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

export function normalizeCapabilities(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(
        new Set(
            value.map((entry) => String(entry ?? "").trim()).filter(Boolean),
        ),
    ).sort();
}

export function normalizeMetadata(
    value: unknown,
): Record<string, string> | null {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const entries = Object.entries(value).flatMap(([key, entryValue]) => {
        const normalizedKey = String(key ?? "").trim();
        const normalizedValue = String(entryValue ?? "").trim();
        return normalizedKey && normalizedValue
            ? [[normalizedKey, normalizedValue] as const]
            : [];
    });
    return entries.length > 0 ? Object.fromEntries(entries) : null;
}
