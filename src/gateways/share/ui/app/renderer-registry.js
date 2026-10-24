const shareRenderers = new Map();

export function registerShareRenderer(resourceType, renderer) {
    const normalizedResourceType = String(resourceType ?? "").trim();
    if (!normalizedResourceType || typeof renderer !== "function") {
        return;
    }
    shareRenderers.set(normalizedResourceType, renderer);
}

export function getShareRenderer(resourceType) {
    return shareRenderers.get(String(resourceType ?? "").trim()) ?? null;
}
