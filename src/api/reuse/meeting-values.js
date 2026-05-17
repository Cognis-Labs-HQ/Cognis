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

export function normalizeInstanceUrl(rawUrl) {
    const candidate = String(rawUrl ?? "").trim();
    if (!candidate) return "";
    try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return "";
        }
        parsed.pathname = parsed.pathname.replace(/\/+$/, "");
        parsed.search = "";
        parsed.hash = "";
        return parsed.toString().replace(/\/+$/, "");
    } catch {
        return "";
    }
}

export function normalizeMeetingPrefix(rawPrefix) {
    return String(rawPrefix ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}

export function isModeratorRole(role) {
    const normalized = String(role ?? "")
        .trim()
        .toLowerCase();
    return (
        normalized === "admin" ||
        normalized === "owner" ||
        normalized === "teacher"
    );
}
