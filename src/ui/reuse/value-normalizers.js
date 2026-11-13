/**
 * Generic browser-side value normalization helpers.
 *
 * Public exports:
 * - normalizeUsername(value): Normalizes a user handle for matching.
 * - resolveUrlHost(value): Extracts a URL host string or an empty fallback.
 * - resolveUrlOrigin(value): Extracts a URL origin string or an empty fallback.
 * - resolveUrlPathSlug(value): Extracts a trimmed path slug from a URL.
 */
export function normalizeUsername(value) {
    return String(value ?? "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
}

export function resolveUrlHost(value) {
    try {
        return new URL(value).host;
    } catch {
        return "";
    }
}

export function resolveUrlOrigin(value) {
    try {
        return new URL(value).origin;
    } catch {
        return "";
    }
}

export function resolveUrlPathSlug(value) {
    try {
        return new URL(value).pathname.replace(/^\/+|\/+$/g, "");
    } catch {
        return "";
    }
}
