/**
 * Reusable browser-side meeting value helpers for participant names and meeting URLs.
 *
 * Public exports:
 * - normalizeUsername(value): Normalizes a user handle for participant matching.
 * - resolveUrlHost(value): Extracts a URL host string or an empty fallback.
 * - resolveUrlOrigin(value): Extracts a URL origin string or an empty fallback.
 * - resolveUrlPathSlug(value): Extracts a trimmed path slug from a URL.
 *
 * Usage example:
 *   const username = normalizeUsername("@Alice");
 *   const host = resolveUrlHost(meeting.instanceUrl || meeting.meetingUrl);
 *
 * @param {unknown} value - Raw username or URL-like value.
 * @returns {string} Normalized username or parsed URL component, with an empty string on invalid input.
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
