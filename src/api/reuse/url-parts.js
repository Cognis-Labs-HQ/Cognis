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

export function normalizeHttpUrl(rawUrl) {
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

export function resolveExternalBaseUrl(env = process.env) {
    return String(env.EXTERNAL_HOST ?? (env.HOST ? `http://${env.HOST}` : ""))
        .trim()
        .replace(/\/+$/g, "");
}
