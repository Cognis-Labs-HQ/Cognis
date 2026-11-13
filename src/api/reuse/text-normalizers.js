export function normalizeCollapsedText(value, fallback = "") {
    const normalized = String(value ?? "")
        .trim()
        .replace(/\s+/g, " ");
    return normalized || fallback;
}

export function normalizeLeadingSlashPath(value) {
    const candidate = String(value ?? "").trim();
    if (!candidate) return "";
    return candidate.startsWith("/") ? candidate : `/${candidate}`;
}
