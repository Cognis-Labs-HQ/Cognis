import { extendI18n } from "../../reuse/i18n.js";

function resolveManifestString(moduleI18n, value) {
    if (typeof value !== "string") return value;
    return moduleI18n.t(value) || value;
}

export async function localizeModulePresentation(
    module,
    baseI18n,
    extend = extendI18n,
) {
    const stringsBaseUrl = module.ui
        ? module.ui.stringsBaseUrl
        : module.id
          ? `/static/modules/${module.id}/languages`
          : undefined;
    const moduleI18n = await extend(baseI18n, stringsBaseUrl);
    module.localizedPresentation = {
        name: resolveManifestString(moduleI18n, module.name),
        summary: resolveManifestString(moduleI18n, module.summary),
        description: resolveManifestString(moduleI18n, module.description),
        categories: (module.categories ?? []).map((value) =>
            resolveManifestString(moduleI18n, value),
        ),
        tags: (module.tags ?? []).map((value) =>
            resolveManifestString(moduleI18n, value),
        ),
    };
    return module;
}

export function resolveLocalizedReadme(module, locale) {
    const normalizedLocale = String(locale ?? "en").toLowerCase();
    const baseLocale = normalizedLocale.split("-")[0];
    return (
        module.readmes?.[normalizedLocale] ??
        module.readmes?.[baseLocale] ??
        module.readmes?.en ??
        module.readmes?.default ??
        module.readme ??
        module.localizedPresentation?.description ??
        module.description ??
        ""
    );
}

export function formatVersion(version) {
    const normalized = String(version ?? "").replace(/^v/, "");
    return normalized ? `v${normalized}` : "";
}

export function resolveModuleRepositoryUrl(module) {
    const candidate = String(
        module?.cloneUrl ?? module?.repository ?? "",
    ).trim();
    if (!candidate) return "";
    try {
        const url = new URL(candidate);
        if (!["http:", "https:"].includes(url.protocol)) return "";
        if (url.username || url.password) return "";
        url.hash = "";
        url.search = "";
        url.pathname = url.pathname.replace(/\.git\/?$/, "").replace(/\/$/, "");
        return url.toString().replace(/\/$/, "");
    } catch {
        return "";
    }
}

export function detailModuleUuid(pathname = window.location.pathname) {
    const match = pathname.match(/^\/administration\/modules\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
}

export function compareVersions(left, right) {
    const parts = (value) =>
        String(value ?? "")
            .replace(/^v/, "")
            .split(/[.-]/)
            .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
    const leftParts = parts(left);
    const rightParts = parts(right);
    for (
        let index = 0;
        index < Math.max(leftParts.length, rightParts.length);
        index += 1
    ) {
        if ((leftParts[index] ?? 0) === (rightParts[index] ?? 0)) continue;
        return (leftParts[index] ?? 0) > (rightParts[index] ?? 0) ? 1 : -1;
    }
    return 0;
}

export function resolveSelectedBranch(module, selectedBranch) {
    const channels = [...(module.branches ?? []), ...(module.releases ?? [])];
    return channels.some((channel) => channel.name === selectedBranch)
        ? selectedBranch
        : module.defaultBranch;
}

function selectedChannel(module, branch) {
    return [...(module.branches ?? []), ...(module.releases ?? [])].find(
        (entry) => entry.name === branch,
    );
}

export function hasModuleUpdate(module, branch) {
    if (module.updateAvailable) return true;
    const channel = selectedChannel(module, branch);
    if (!channel) return false;
    if (
        module.installedCommit &&
        channel.commit &&
        module.installedCommit !== channel.commit
    ) {
        return true;
    }
    const installedVersion = module.installedVersion ?? module.version;
    return Boolean(
        channel.version &&
        installedVersion &&
        compareVersions(channel.version, installedVersion) !== 0,
    );
}

export function moduleChangeDirection(module, branch) {
    const channel = selectedChannel(module, branch);
    if (!channel?.version) return "update";
    const comparison = compareVersions(
        channel.version,
        module.installedVersion ?? module.version,
    );
    if (comparison < 0) return "downgrade";
    if (comparison > 0) return "upgrade";
    return hasModuleUpdate(module, branch) ? "update" : "none";
}
