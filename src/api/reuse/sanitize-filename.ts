export function sanitizeFilenameBase(
    value: unknown,
    fallback = "file",
): string {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^\w-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return normalized || fallback;
}
