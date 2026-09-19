export function renderRepositoryLink({ module, resolveUrl, escapeHtml }) {
    const repositoryUrl = resolveUrl(module);
    if (!repositoryUrl) return "";
    const escapedUrl = escapeHtml(repositoryUrl);
    return `<div class="module-repository-link"><img src="/static/assets/reuse/hyperlink.svg" alt="" aria-hidden="true"><a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedUrl}</a></div>`;
}

export function renderRestartWarning({ module, i18n, escapeHtml }) {
    if (!module.restartRequired) return "";
    const message = escapeHtml(i18n.t("ui.app.modules.restart_required"));
    return `<span class="module-restart-warning" role="img" aria-label="${message}" title="${message}">!</span>`;
}

export function renderAvailableVersion({
    module,
    selectedBranch,
    releaseChannels,
    compareVersions,
    formatVersion,
    escapeHtml,
}) {
    if (!module.installed) return "";
    const currentVersion = module.installedVersion ?? module.version;
    const channel = releaseChannels(module).find(
        (entry) => entry.name === selectedBranch(module),
    );
    if (!channel?.version || channel.version === currentVersion) return "";
    const isDowngrade = compareVersions(channel.version, currentVersion) < 0;
    const icon = isDowngrade ? "arrow-down" : "arrow-up";
    const version = formatVersion(channel.version);
    return `<span class="module-available-version${isDowngrade ? " is-downgrade" : ""}"><img src="/static/assets/reuse/${icon}.svg" alt="" aria-hidden="true"><span>${escapeHtml(version)}</span></span>`;
}

export const createSelectedBranchResolver =
    (selectedBranches, resolveBranch) => (module) =>
        resolveBranch(
            module,
            selectedBranches.get(module.uuid) ??
                module.selectedBranch ??
                module.installedBranch ??
                module.defaultBranch,
        );
