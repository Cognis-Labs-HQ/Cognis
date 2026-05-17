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
