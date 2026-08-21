import { loadModuleAsset } from "./api.js";

const authenticatedAssetUrls = new Map();

export function resolveModuleAssetUrl(value) {
    const candidate = String(value ?? "").trim();
    if (authenticatedAssetUrls.has(candidate)) {
        return authenticatedAssetUrls.get(candidate);
    }
    if (candidate.startsWith("/")) return candidate;
    try {
        const parsed = new URL(candidate);
        return parsed.protocol === "https:" ? parsed.toString() : "";
    } catch {
        return "";
    }
}

export async function loadAuthenticatedModuleAssets(moduleList) {
    const assetUrls = moduleList.flatMap((module) => [
        module.assets?.icon,
        module.assets?.banner,
        ...(module.assets?.screenshots ?? []),
        ...(module.assets?.media ?? []).map((entry) => entry.url),
    ]);
    const authenticatedUrls = [
        ...new Set(
            assetUrls.filter((url) => String(url ?? "").startsWith("/api/")),
        ),
    ].filter((url) => !authenticatedAssetUrls.has(url));
    await Promise.all(
        authenticatedUrls.map(async (url) => {
            const objectUrl = await loadModuleAsset(url);
            if (objectUrl) authenticatedAssetUrls.set(url, objectUrl);
        }),
    );
}

export function clearAuthenticatedModuleAssets() {
    for (const objectUrl of authenticatedAssetUrls.values()) {
        URL.revokeObjectURL(objectUrl);
    }
    authenticatedAssetUrls.clear();
}
