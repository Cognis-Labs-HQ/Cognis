export function versionDescriptor<T>(descriptor: T, assetVersion: string): T {
    if (Array.isArray(descriptor)) {
        return descriptor.map((value) =>
            versionDescriptor(value, assetVersion),
        ) as T;
    }
    if (!descriptor || typeof descriptor !== "object") return descriptor;
    return Object.fromEntries(
        Object.entries(descriptor).map(([key, value]) => [
            key,
            typeof value === "string"
                ? versionAssetUrl(value, assetVersion)
                : versionDescriptor(value, assetVersion),
        ]),
    ) as T;
}

function versionAssetUrl(assetUrl: string, assetVersion: string): string {
    if (assetUrl.startsWith("/assets/")) return assetUrl;
    if (!assetUrl.startsWith("/static/") && !assetUrl.startsWith("/assets/")) {
        return assetUrl;
    }
    const pathname = new URL(assetUrl, "http://localhost").pathname;
    if (!/\.(?:css|html|jpe?g|js|json|mjs|png|svg|webp|xml)$/.test(pathname)) {
        return assetUrl;
    }
    const separator = assetUrl.includes("?") ? "&" : "?";
    return `${assetUrl}${separator}v=${encodeURIComponent(assetVersion)}`;
}
