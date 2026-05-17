export function normalizeUsername(value) {
    return String(value ?? "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
}

export function normalizeUsernames(values) {
    return Array.from(
        new Set(
            (Array.isArray(values) ? values : [])
                .map((value) => normalizeUsername(value))
                .filter(Boolean),
        ),
    ).sort();
}

export function normalizeMeetingPrefix(rawPrefix) {
    const value = String(rawPrefix ?? "")
        .trim()
        .toLowerCase();
    if (!value) return "";
    return value
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function normalizeInstanceUrl(rawUrl) {
    const trimmed = String(rawUrl ?? "").trim();
    if (!trimmed) return null;
    try {
        const parsed = new URL(trimmed);
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return null;
    }
}

export function isModeratorRole(roleName) {
    const normalizedRole = String(roleName ?? "")
        .trim()
        .toLowerCase();
    return (
        normalizedRole === "owner" ||
        normalizedRole === "admin" ||
        normalizedRole === "teacher"
    );
}
