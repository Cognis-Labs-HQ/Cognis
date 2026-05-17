export function extractUrlOrigin(value) {
    try {
        const parsed = new URL(String(value ?? ""));
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return null;
    }
}

export function extractUrlPathSlug(value) {
    try {
        const parsed = new URL(String(value ?? ""));
        const cleanPath = parsed.pathname.replace(/^\/+/, "");
        return cleanPath || null;
    } catch {
        return null;
    }
}
