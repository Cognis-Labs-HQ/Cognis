export function formatVersion(version) {
    const normalized = String(version ?? "").replace(/^v/, "");
    return normalized ? `v${normalized}` : "";
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
