import { escapeHtml } from "../../reuse/escape-html.js";
import { hasModuleUpdate, moduleChangeDirection } from "./presentation.js";

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

export function renderLifecycleActions({
    module,
    i18n,
    pendingAction,
    uncertain,
    uncertaintyKind,
    selectedBranch,
}) {
    if (uncertain) {
        return `<span role="status">${escapeHtml(i18n.t(uncertaintyKind === "installation" ? "ui.app.modules.installation_unknown" : "ui.app.modules.outcome_unknown"))}</span><button type="button" class="btn-neutral" data-module-recheck="${escapeHtml(module.uuid)}"${Boolean(pendingAction) ? " disabled" : ""}>${escapeHtml(i18n.t("ui.app.modules.recheck_state"))}</button>`;
    }
    if (module.restartRequired) {
        return `<button type="button" class="btn-neutral" disabled>${escapeHtml(i18n.t("ui.app.modules.restart_required"))}</button>`;
    }
    if (!module.installed && !module.status) {
        return renderLifecycleButton(module, "install", "confirm");
    }
    const installedLabel =
        pendingAction === "change-channel"
            ? i18n.t("ui.app.modules.changing_release_channel")
            : pendingAction === "force-update"
              ? i18n.t("ui.app.modules.installing")
              : i18n.t("ui.reuse.installed");
    const installedPending = ["change-channel", "force-update"].includes(
        pendingAction,
    );
    const installedState = `<button type="button" class="btn-neutral${installedPending ? " button-loading" : ""}" disabled${installedPending ? ' aria-busy="true"' : ""}>${escapeHtml(installedLabel)}</button>`;
    if (module.status === "enabled") {
        return `${installedState}${hasModuleUpdate(module, selectedBranch(module)) ? renderLifecycleButton(module, "update", "confirm") : ""}${renderLifecycleButton(module, "disable", "cancel")}`;
    }
    return `${installedState}${hasModuleUpdate(module, selectedBranch(module)) ? renderLifecycleButton(module, "update", "confirm") : ""}${renderLifecycleButton(module, "enable", "confirm")}${renderLifecycleButton(module, "uninstall", "cancel")}`;

    function renderLifecycleButton(module, action, consequence) {
        const isPending = pendingAction === action;
        const isBlocked = Boolean(pendingAction);
        const updateDirection =
            action === "update"
                ? moduleChangeDirection(module, selectedBranch(module))
                : action;
        const pendingLabelKey =
            {
                enable: "ui.app.modules.enabling",
                disable: "ui.app.modules.disabling",
                uninstall: "ui.app.modules.uninstalling",
                upgrade: "ui.app.modules.upgrading",
                downgrade: "ui.app.modules.downgrading",
            }[updateDirection] ?? "ui.app.modules.installing";
        const labelKey = isPending
            ? pendingLabelKey
            : `ui.${["upgrade", "downgrade"].includes(updateDirection) ? "app.modules" : "reuse"}.${updateDirection}`;
        return `<button type="button" class="btn-${consequence}${isPending ? " button-loading" : ""}" data-module-${action}="${escapeHtml(module.uuid)}"${isBlocked ? " disabled" : ""}${isPending ? ' aria-busy="true"' : ""}>${escapeHtml(i18n.t(labelKey))}</button>`;
    }
}
