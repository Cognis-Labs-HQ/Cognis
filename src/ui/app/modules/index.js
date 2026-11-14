import {
    captureModuleAuthority,
    captureModuleOwner,
    moduleActivationReady,
    modulePendingAction,
    moduleLifecycleUnsettled,
    reconcileObservedModuleStates,
    dispatchModuleLifecycleRefresh as dispatchLifecycleRefresh,
    runModuleLifecycleAction,
    reportModuleStateReadFailure,
    reportModuleActionFailure,
} from "./lifecycle.js";
import { guides } from "./guides.js";
import { formatModuleTag } from "./filters.js";
import {
    prepareInstalledCatalog,
    prepareDiscoveredCatalog,
} from "./catalog.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import {
    getFloatingSlot,
    restoreWindowScrollPosition,
} from "../../reuse/page-composer/dom-position.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";
import { renderMarkdown } from "../../reuse/markdown-renderer.js";
import { beginButtonLoading } from "../../reuse/button-loading.js";
import { beginPageLoading, mountWhenDirect } from "../../reuse/page-entry.js";
import { replaceMountScope } from "../../reuse/mount-scope.js";
import { openHamburgerMenu } from "../../reuse/hamburger-menu.js";
import { uiCtx } from "../../reuse/ui-ctx.js";
import {
    initializeScreenshotCarousels,
    revealLoadedModulePictures,
    updateScreenshotCarousel,
} from "./carousel.js";
import {
    loadAvailableModules,
    loadMarketplaceState,
    saveModuleReleaseChannel,
} from "./api.js";
import {
    applyModuleFilterSelection,
    createModuleFilters,
    filterModules,
    renderModuleFilters,
} from "./filters.js";
import {
    compareVersions,
    detailModuleUuid,
    formatVersion,
    resolveModuleRepositoryUrl,
    resolveLocalizedReadme,
    resolveSelectedBranch,
} from "./presentation.js";
import { openMarketplaceSettings } from "./source-settings.js";
import { resolveModuleAssetUrl } from "./assets.js";
import {
    confirmModuleDependencies,
    moduleActionNeedsDependencies,
    resolveInstallDependencies,
} from "./dependencies.js";
import { releaseChannels } from "./release-channels.js";
import {
    createModulesPagePolling,
    createSerializedOperationQueue,
    reportMarketplaceSourceFailures,
} from "./polling.js";
import {
    renderAvailableVersion as renderVersion,
    renderLifecycleActions as renderModuleLifecycleActions,
    createSelectedBranchResolver,
    renderRepositoryLink as renderRepository,
    renderRestartWarning as renderRestart,
} from "./detail-rendering.js";

let i18n;
let composer;
let pageRoot;
let modules = [];
let sources = [];
let marketplaceEtag;
let marketplaceSourceRevision;
const filters = createModuleFilters();
let selectedModule = null;
let discoverySequence = 0;
let marketplaceRefreshPending = false;
let refreshScreenshotCarousels = () => {};
let pageMountController = null;
const selectedBranches = new Map();
const pendingModuleActions = new Map();
const pendingActionOwners = new Map();
const pendingDependencyChecks = new Set();
const uncertainModuleActions = new Map();
let pageAuthority = () => false;
const screenshotIndexes = new Map();
const selectedBranch = createSelectedBranchResolver(
    selectedBranches,
    resolveSelectedBranch,
);
const MODULE_ICON_FALLBACK_URL = "/assets/reuse/module-icon-unknown.svg";
const PRIVATE_SOURCE_FAILURE_KEYS = new Set([
    "private_repository_access_failed",
    "private_repository_contents_access_failed",
]);

export const isMarketplaceRefreshPending = () => marketplaceRefreshPending;

const queueModuleLifecycleAction = createSerializedOperationQueue();

const reportSourceFailures = (failures) =>
    reportMarketplaceSourceFailures({
        failures,
        privateFailureKeys: PRIVATE_SOURCE_FAILURE_KEYS,
        i18n,
        showToast,
    });

const startMarketplacePolling = createModulesPagePolling({
    isRefreshPending: () =>
        uiCtx.capabilities.get("offline:state")?.isOffline() === true ||
        marketplaceRefreshPending ||
        pendingModuleActions.size > 0 ||
        pendingDependencyChecks.size > 0,
    loadKnownModules: (signal) => loadKnownModules(false, signal),
    discoverSources: (signal) => discoverConfiguredSources(false, signal),
    log: (...args) => uiCtx.capabilities.get("ui:log")?.(...args),
    translate: (key) => i18n.t(key),
});

function renderAvailableVersion(module) {
    return renderVersion({
        module,
        selectedBranch,
        releaseChannels,
        compareVersions,
        formatVersion,
        escapeHtml,
    });
}

function renderCard(module) {
    const presentation = module.localizedPresentation ?? module;
    const avatarUrl = resolveModuleAssetUrl(module.assets?.icon);
    const avatar = avatarUrl
        ? `<img class="module-store-avatar module-picture" src="${escapeHtml(avatarUrl)}" data-resource-id="${escapeHtml(module.uuid)}" data-resource-fallback="${MODULE_ICON_FALLBACK_URL}" alt="" loading="lazy" width="64" height="64">`
        : `<img class="module-store-avatar module-picture" src="${MODULE_ICON_FALLBACK_URL}" alt="" loading="lazy" width="64" height="64">`;
    return `<article class="module-store-card" data-tutorial-module="${escapeHtml(module.id)}" data-module-uuid="${module.uuid}" tabindex="0">
      ${avatar}
      <div class="module-store-card-copy">
        <div class="module-store-card-heading"><h3>${escapeHtml(presentation.name)}${renderRestartWarning(module)}</h3>${module.recommended ? `<span class="state-pill pill-active">${escapeHtml(i18n.t("ui.app.modules.recommended"))}</span>` : ""}</div>
        <p>${escapeHtml(presentation.summary ?? presentation.description ?? "")}</p>
        <span class="module-store-publisher">${escapeHtml(module.publisher ?? "")} · ${escapeHtml(formatVersion(module.installed ? (module.installedVersion ?? module.version) : module.version))}</span>
        ${renderAvailableVersion(module)}
      </div>
      <div class="module-store-card-actions">${renderLifecycleActions(module)}</div>
    </article>`;
}

function renderRepositoryLink(module) {
    return renderRepository({
        module,
        resolveUrl: resolveModuleRepositoryUrl,
        escapeHtml,
    });
}

function renderRestartWarning(module) {
    return renderRestart({ module, i18n, escapeHtml });
}

function renderLifecycleActions(module) {
    return renderModuleLifecycleActions({
        module,
        i18n,
        pendingAction:
            pendingModuleActions.get(module.uuid) ??
            modulePendingAction(module),
        uncertain: uncertainModuleActions.get(module.uuid)?.current(),
        uncertaintyKind: uncertainModuleActions.get(module.uuid)
            ?.uncertaintyKind,
        selectedBranch,
    });
}

function renderModuleDetails(module) {
    const presentation = module.localizedPresentation ?? module;
    const bannerUrl = resolveModuleAssetUrl(module.assets?.banner);
    const screenshotUrls = (module.assets?.screenshots ?? [])
        .map(resolveModuleAssetUrl)
        .filter(Boolean);
    const screenshots = screenshotUrls
        .map(
            (url, index) =>
                `<img class="module-detail-screenshot module-picture" data-screenshot-index="${index}" src="${escapeHtml(url)}" alt="" loading="lazy">`,
        )
        .join("");
    const screenshotCarousel = screenshots
        ? `<div class="module-detail-screenshots" data-screenshot-carousel="${escapeHtml(module.uuid)}"><button type="button" class="btn-neutral module-screenshot-control is-previous" data-screenshot-step="-1" aria-label="${escapeHtml(i18n.t("ui.reuse.previous"))}"><span class="module-icon module-icon-back" aria-hidden="true"></span></button><div class="module-screenshot-stage">${screenshots}</div><button type="button" class="btn-neutral module-screenshot-control is-next" data-screenshot-step="1" aria-label="${escapeHtml(i18n.t("ui.reuse.next"))}"><span class="module-icon module-icon-back module-icon-next" aria-hidden="true"></span></button></div>`
        : "";
    const media = (module.assets?.media ?? [])
        .map((entry) => {
            const url = escapeHtml(resolveModuleAssetUrl(entry.url));
            return entry.contentType?.startsWith("video/")
                ? `<video class="module-detail-media-item" controls preload="metadata"><source src="${url}" type="${escapeHtml(entry.contentType)}"></video>`
                : `<img class="module-detail-media-item module-picture" src="${url}" alt="" loading="lazy">`;
        })
        .join("");
    const metadata = [
        ...(presentation.categories ?? []),
        ...(presentation.tags ?? []),
    ]
        .filter(Boolean)
        .map((value) => `<span>${escapeHtml(value)}</span>`)
        .join("");
    const branchSelector =
        !module.installed && module.branches?.length
            ? `<label class="module-detail-branch"><span>${escapeHtml(i18n.t("ui.app.modules.release_channel"))}</span><select data-module-branch="${escapeHtml(module.uuid)}"><optgroup label="${escapeHtml(i18n.t("ui.app.modules.branches"))}">${module.branches.map((branch) => `<option value="${escapeHtml(branch.name)}"${branch.name === selectedBranch(module) ? " selected" : ""}>${escapeHtml(branch.name)}${branch.name === module.defaultBranch ? ` (${escapeHtml(i18n.t("ui.app.modules.default_branch"))})` : ""}</option>`).join("")}</optgroup>${module.releases?.length ? `<optgroup label="${escapeHtml(i18n.t("ui.app.modules.releases"))}">${module.releases.map((release) => `<option value="${escapeHtml(release.name)}"${release.name === selectedBranch(module) ? " selected" : ""}>${escapeHtml(release.name)}</option>`).join("")}</optgroup>` : ""}</select></label>`
            : "";
    const license = module.license
        ? `<p class="module-detail-license"><strong>${escapeHtml(i18n.t("ui.reuse.license"))}:</strong> ${escapeHtml(module.license)}</p>`
        : "";
    const displayedChannel = selectedBranch(module);
    const displayedVersion = module.installed
        ? (module.installedVersion ?? module.version)
        : (releaseChannels(module).find(
              (channel) => channel.name === displayedChannel,
          )?.version ?? module.version);
    const release = `<div class="module-detail-release"><p><strong>${escapeHtml(i18n.t("ui.app.modules.release_channel"))}:</strong> ${escapeHtml(displayedChannel ?? "")}${displayedVersion ? `, ${escapeHtml(formatVersion(displayedVersion))}` : ""}${renderRestartWarning(module)}</p>${renderAvailableVersion(module)}</div>`;
    const advanced =
        module.installed && !module.restartRequired
            ? `<button type="button" class="btn-neutral module-icon-button module-detail-advanced" data-module-menu="${escapeHtml(module.uuid)}" aria-label="${escapeHtml(i18n.t("ui.app.modules.advanced_options"))}"${pendingModuleActions.has(module.uuid) || moduleLifecycleUnsettled(module) ? " disabled" : ""}>☰</button>`
            : "";
    const settings =
        module.installed && module.ui?.preferences?.length
            ? `<button type="button" class="btn-neutral module-icon-button module-detail-settings" data-module-preferences="${escapeHtml(module.uuid)}" title="${escapeHtml(i18n.t("ui.reuse.settings"))}" aria-label="${escapeHtml(i18n.t("ui.reuse.settings"))}"${pendingModuleActions.has(module.uuid) || moduleLifecycleUnsettled(module) ? " disabled" : ""}><span class="module-icon module-icon-settings" aria-hidden="true"></span></button>`
            : "";
    const headerActions =
        advanced || settings
            ? `<div class="module-detail-header-actions">${advanced}${settings}</div>`
            : "";
    return `<article class="module-detail">${bannerUrl ? `<img class="module-detail-banner module-picture" src="${escapeHtml(bannerUrl)}" data-resource-id="${escapeHtml(module.uuid)}" data-resource-fallback-text="${escapeHtml(i18n.t("ui.reuse.image_unavailable"))}" data-resource-fallback-class="module-detail-banner module-image-unavailable" alt="">` : `<div class="module-detail-banner module-image-unavailable">${escapeHtml(i18n.t("ui.reuse.image_unavailable"))}</div>`}<header class="module-detail-header"><div><h2>${escapeHtml(presentation.name)}</h2>${renderRepositoryLink(module)}<p>${escapeHtml(presentation.summary ?? "")}</p><p class="module-detail-provider"><strong>${escapeHtml(module.publisher ?? "")}</strong></p>${release}${license}<div class="module-detail-metadata">${metadata}</div>${branchSelector}</div>${headerActions}</header>${media ? `<div class="module-detail-media" aria-label="${escapeHtml(i18n.t("ui.app.modules.media"))}">${media}</div>` : ""}${screenshotCarousel}<div class="module-detail-readme">${renderMarkdown(resolveLocalizedReadme(module, i18n.locale))}</div></article>`;
}

function renderDetailActions(module) {
    return `<button type="button" class="btn-neutral module-icon-button module-detail-back" data-module-back title="${escapeHtml(i18n.t("ui.reuse.back"))}" aria-label="${escapeHtml(i18n.t("ui.reuse.back"))}"><span class="module-icon module-icon-back" aria-hidden="true"></span></button>${renderLifecycleActions(module)}`;
}

const formatTag = (tag) => formatModuleTag(tag, modules, i18n);

function renderSidebar(categories) {
    return renderModuleFilters(categories, filters, {
        i18n,
        escapeHtml,
        formatTag,
    });
}

function renderStore() {
    const refreshPending = isMarketplaceRefreshPending();
    const refreshButtonClass = `btn-neutral module-icon-button${refreshPending ? " button-loading module-icon-button-loading" : ""}`;
    const refreshIcon = refreshPending
        ? ""
        : '<span class="module-icon module-icon-refresh" aria-hidden="true"></span>';
    const refreshBusyAttributes = refreshPending
        ? " disabled" + ' aria-busy="true"'
        : "";
    return `<section class="module-store-results">
        ${selectedModule ? renderModuleDetails(selectedModule) : `<div class="module-store-toolbar"><h2>${escapeHtml(i18n.t("ui.reuse.modules"))}</h2><div class="module-store-toolbar-actions"><button id="module-source-refresh" class="${refreshButtonClass}" type="button" title="${escapeHtml(i18n.t("ui.reuse.refresh"))}" aria-label="${escapeHtml(i18n.t("ui.reuse.refresh"))}"${refreshBusyAttributes}>${refreshIcon}</button><button id="module-marketplace-settings" class="btn-neutral module-icon-button" type="button" title="${escapeHtml(i18n.t("ui.reuse.settings"))}" aria-label="${escapeHtml(i18n.t("ui.reuse.settings"))}"><span class="module-icon module-icon-settings" aria-hidden="true"></span></button></div></div><div class="module-store-grid">${filterModules(modules, filters).map(renderCard).join("") || `<p>${escapeHtml(i18n.t("ui.app.modules.empty"))}</p>`}</div>`}
      </section>`;
}

async function ensureModuleDependenciesReady(module, owner, selection) {
    const dependencySelection =
        selection ??
        (await confirmModuleDependencies(module, modules, i18n, (dependency) =>
            installAndEnableDependency(dependency, owner),
        ));
    if (!dependencySelection) return false;
    for (const dependency of resolveInstallDependencies(
        module,
        modules,
        dependencySelection.soft,
    )) {
        if (!moduleActivationReady(dependency, owner)) return false;
        if (!dependency.installed) {
            const installed = await runLifecycleAction(dependency, "install", {
                owner,
            });
            if (!installed) return false;
        }
        if (dependency.status !== "enabled") {
            const enabled = await runLifecycleAction(dependency, "enable", {
                owner,
            });
            if (!enabled) return false;
        }
    }
    return dependencySelection;
}

async function runLifecycleAction(
    module,
    action,
    { dependencySelection, owner = lifecycleOwner() } = {},
) {
    if (module.restartRequired || !owner.current()) return false;
    discoverySequence++;
    if (moduleActionNeedsDependencies(module, action)) {
        dependencySelection = await ensureModuleDependenciesReady(
            module,
            owner,
            dependencySelection,
        );
        if (!dependencySelection) return false;
    }
    const result = await runModuleLifecycleAction(module, action, owner, {
        branch: selectedBranch(module),
        onBranchSelected: (branch) => selectedBranches.set(module.uuid, branch),
        beforeEnable() {
            for (const dependency of resolveInstallDependencies(
                module,
                modules,
                dependencySelection?.soft ?? [],
            )) {
                if (
                    !moduleActivationReady(dependency, owner) ||
                    !dependency.installed ||
                    dependency.status !== "enabled"
                )
                    throw Object.assign(
                        new Error("module_dependency_disabled"),
                        { code: "module_dependency_disabled" },
                    );
            }
        },
    });
    const { outcome } = result;
    if (["cancelled", "obsolete"].includes(outcome)) return false;
    if (outcome === "unknown") {
        uncertainModuleActions.set(module.uuid, {
            current: owner.current,
            expectedStatus: result.expectedStatus,
            uncertaintyKind: result.uncertaintyKind,
        });
        if (owner.visible()) {
            refreshMarketplace();
            showToast(
                owner.i18n.t(
                    result.uncertaintyKind === "installation"
                        ? "ui.app.modules.installation_unknown"
                        : "ui.app.modules.outcome_unknown",
                ),
                {
                    type: "warning",
                },
            );
        }
        return false;
    }
    action = result.action ?? action;
    if (result.status) module.status = result.status;
    if (!owner.current()) return false;
    uncertainModuleActions.delete(module.uuid);
    dispatchLifecycleRefresh(
        module,
        outcome === "reconciled"
            ? result.status === "enabled"
                ? "enable"
                : "disable"
            : action,
        outcome === "reconciled" ? "observed-state" : "acknowledged-response",
    );
    if (owner.visible()) {
        selectedModule =
            selectedModule?.uuid === module.uuid ? module : selectedModule;
        refreshMarketplace();
        showToast(
            owner.i18n.t(
                outcome === "reconciled"
                    ? "ui.app.modules.state_reconciled"
                    : action === "configure"
                      ? "ui.app.modules.preferences_saved"
                      : `ui.app.modules.${action}_complete`,
            ),
            { type: outcome === "reconciled" ? "info" : "success" },
        );
        if (module.restartRequired) {
            showToast(owner.i18n.t("ui.app.modules.restart_required"), {
                type: "warning",
            });
        }
        void refreshAfterLifecycle(owner);
    }
    // An observed state does not acknowledge activation or required setup.
    return outcome === "confirmed";
}

async function installAndEnableDependency(dependency, owner) {
    if (!moduleActivationReady(dependency, owner)) return false;
    if (!dependency.installed) {
        const installed = await runLifecycleAction(dependency, "install", {
            owner,
        });
        if (!installed) return false;
    }
    if (dependency.status === "enabled") return true;
    return runLifecycleAction(dependency, "enable", { owner });
}

const lifecycleOwner = (signal = pageMountController?.signal) =>
    captureModuleOwner({
        signal,
        i18n,
        currentSignal: () => pageMountController?.signal,
    });

function refreshAfterLifecycle(owner) {
    return loadKnownModules(false, owner.signal).catch((error) =>
        reportModuleStateReadFailure(error, owner),
    );
}

function refreshMarketplace() {
    if (pageMountController?.signal.aborted || !pageAuthority()) return;
    const scrollPosition = {
        left: window.scrollX,
        top: window.scrollY,
    };
    composer?.refreshElements(["module-store"]);
    const sidebar = pageRoot?.querySelector("[data-module-sidebar]");
    if (sidebar) {
        const categories = [
            ...new Set(
                filterModules(modules, {
                    ...filters,
                    categories: new Set(),
                }).flatMap((module) => module.tags ?? []),
            ),
        ].sort((left, right) => left.localeCompare(right));
        sidebar.outerHTML = renderSidebar(categories);
    }
    refreshDetailActions();
    revealLoadedModulePictures(pageRoot);
    refreshScreenshotCarousels();
    restoreWindowScrollPosition(scrollPosition.left, scrollPosition.top);
}

function refreshDetailActions() {
    if (pageMountController?.signal.aborted || !pageAuthority()) return;
    const actions = getFloatingSlot(pageRoot, "module-actions");
    if (actions) {
        actions.innerHTML = selectedModule
            ? renderDetailActions(selectedModule)
            : "";
        actions.hidden = !selectedModule;
    }
}

async function loadKnownModules(
    restoreDetailRoute = false,
    signal = pageMountController?.signal,
) {
    const current = pageAuthority;
    const sequence = ++discoverySequence;
    const selectedModuleUuid =
        selectedModule?.uuid ??
        (restoreDetailRoute ? detailModuleUuid() : null);
    const snapshot = await loadMarketplaceState(marketplaceEtag, { signal });
    if (sequence !== discoverySequence || signal?.aborted || !current()) return;
    if (!snapshot) return { sourceRevision: marketplaceSourceRevision };
    const { sources: loadedSources, installed, cached } = snapshot;
    const sourceRevision = JSON.stringify(loadedSources);
    const prepared = await prepareInstalledCatalog(cached, installed, i18n, {
        signal,
    });
    if (sequence !== discoverySequence || signal?.aborted || !current()) return;
    sources = loadedSources;
    marketplaceEtag = snapshot.etag;
    marketplaceSourceRevision = sourceRevision;
    modules = prepared;
    reconcileObservedModuleStates(
        uncertainModuleActions,
        modules,
        dispatchLifecycleRefresh,
    );
    selectedModule = selectedModuleUuid
        ? (modules.find(
              (module) =>
                  module.uuid === selectedModuleUuid &&
                  module.template !== true,
          ) ?? null)
        : null;
    refreshMarketplace();
    return { sourceRevision };
}

async function discoverConfiguredSources(
    forceRefresh = false,
    signal = pageMountController?.signal,
) {
    const sequence = ++discoverySequence;
    const selectedModuleUuid = selectedModule?.uuid;
    const { modules: discovered, sourceFailures } = await loadAvailableModules(
        sources.map((source) => source.uuid),
        forceRefresh,
        { signal },
    );
    if (sequence !== discoverySequence || signal?.aborted) return;
    reportSourceFailures(sourceFailures);
    const prepared = await prepareDiscoveredCatalog(modules, discovered, i18n, {
        signal,
    });
    if (sequence !== discoverySequence || signal?.aborted) return;
    modules = prepared;
    selectedModule = selectedModuleUuid
        ? (modules.find((module) => module.uuid === selectedModuleUuid) ?? null)
        : null;
    refreshMarketplace();
}

async function refreshMarketplaceData(signal) {
    // Repair the source cache before reading presentation data that may be broken.
    discoverySequence++;
    const { sourceFailures } = await loadAvailableModules(undefined, true, {
        signal,
    });
    if (signal.aborted) return;
    reportSourceFailures(sourceFailures);
    marketplaceEtag = undefined;
    await loadKnownModules(false, signal);
}

function bindInteractions(root, signal) {
    const owner = lifecycleOwner(signal);
    root.addEventListener(
        "load",
        (event) => {
            if (event.target.matches?.(".module-picture")) {
                event.target.classList.add("is-loaded");
            }
        },
        { capture: true, signal },
    );
    root.addEventListener(
        "change",
        async (event) => {
            const selector = event.target.closest("[data-module-branch]");
            if (!selector) return;
            try {
                await saveModuleReleaseChannel(
                    selector.dataset.moduleBranch,
                    selector.value,
                );
                selectedBranches.set(
                    selector.dataset.moduleBranch,
                    selector.value,
                );
                refreshMarketplace();
            } catch (error) {
                showToast(error.message, { type: "error" });
            }
        },
        { signal },
    );
    root.addEventListener(
        "keydown",
        (event) => {
            if (!["Enter", " "].includes(event.key)) return;
            const card = event.target.closest(".module-store-card");
            if (!card || event.target.closest("a, button")) return;
            event.preventDefault();
            card.click();
        },
        { signal },
    );
    root.addEventListener(
        "click",
        async (event) => {
            if (event.target.closest("a")) return;
            const target =
                event.target.closest("button") ??
                event.target.closest(".module-store-card");
            if (!target) return;
            if (!owner.current()) return;
            if (target.dataset.moduleRecheck) {
                target.disabled = true;
                try {
                    const state = await loadKnownModules(false, signal);
                    if (!state || !owner.visible()) return;
                    refreshMarketplace();
                } catch (error) {
                    reportModuleStateReadFailure(error, owner);
                } finally {
                    if (owner.visible()) target.disabled = false;
                }
                return;
            }
            if (target.dataset.screenshotStep) {
                updateScreenshotCarousel(
                    target.closest("[data-screenshot-carousel]"),
                    screenshotIndexes,
                    Number(target.dataset.screenshotStep),
                );
                return;
            }
            if (applyModuleFilterSelection(filters, target.dataset)) {
                selectedModule = null;
                await uiCtx.capabilities.get("ui:navigate")?.(
                    "/administration/modules",
                );
                return;
            }
            if (target.id === "module-marketplace-settings") {
                sources = await openMarketplaceSettings(i18n, "settings", {
                    signal,
                });
                if (signal.aborted) return;
                return;
            }
            if (target.id === "module-source-refresh") {
                if (isMarketplaceRefreshPending()) return;
                marketplaceRefreshPending = true;
                refreshMarketplace();
                try {
                    await refreshMarketplaceData(signal);
                    showToast(i18n.t("ui.app.modules.refresh_complete"), {
                        type: "success",
                    });
                } catch (error) {
                    showToast(error.message, { type: "error" });
                } finally {
                    marketplaceRefreshPending = false;
                    refreshMarketplace();
                }
                return;
            }
            if (target.hasAttribute("data-module-back")) {
                selectedModule = null;
                await uiCtx.capabilities.get("ui:navigate")?.(
                    "/administration/modules",
                );
                return;
            }
            let action = target.dataset.modulePreferences
                ? "configure"
                : [
                      "install",
                      "update",
                      "force-update",
                      "change-channel",
                      "enable",
                      "disable",
                      "uninstall",
                  ].find((name) => target.hasAttribute(`data-module-${name}`));
            const moduleUuid =
                target.dataset.modulePreferences ??
                (target.dataset.moduleMenu
                    ? target.dataset.moduleMenu
                    : action
                      ? target.getAttribute(`data-module-${action}`)
                      : target.dataset.moduleUuid);
            const module = modules.find((entry) => entry.uuid === moduleUuid);
            if (target.dataset.moduleMenu && module) {
                const items = [
                    {
                        id: "force-update",
                        label: i18n.t("ui.app.modules.force_update"),
                        variant: "danger",
                    },
                    ...(releaseChannels(module).length
                        ? [
                              {
                                  id: "change-channel",
                                  label: i18n.t(
                                      "ui.app.modules.change_release_channel",
                                  ),
                              },
                          ]
                        : []),
                ];
                action = await openHamburgerMenu(target, { items });
                if (!action) return;
            }
            if (action && module) {
                if (
                    pendingModuleActions.has(module.uuid) ||
                    moduleLifecycleUnsettled(module) ||
                    pendingDependencyChecks.has(module.uuid)
                )
                    return;
                let dependencySelection;
                if (moduleActionNeedsDependencies(module, action)) {
                    pendingDependencyChecks.add(module.uuid);
                    try {
                        dependencySelection =
                            await ensureModuleDependenciesReady(module, owner);
                    } finally {
                        pendingDependencyChecks.delete(module.uuid);
                    }
                    if (!dependencySelection) return;
                }
                discoverySequence += 1;
                pendingModuleActions.set(module.uuid, action);
                pendingActionOwners.set(module.uuid, owner);
                const finishLoading = target.dataset.moduleMenu
                    ? null
                    : beginButtonLoading(target);
                refreshDetailActions();
                try {
                    const completed = await queueModuleLifecycleAction(() =>
                        runLifecycleAction(module, action, {
                            dependencySelection,
                            owner,
                        }),
                    );
                    if (
                        owner.visible() &&
                        completed === false &&
                        action === "install"
                    ) {
                        showToast(i18n.t("ui.app.modules.install_cancelled"), {
                            type: "info",
                        });
                    }
                } catch (error) {
                    reportModuleActionFailure(error, module, action, owner);
                } finally {
                    if (pendingActionOwners.get(module.uuid) !== owner) return;
                    pendingModuleActions.delete(module.uuid);
                    pendingActionOwners.delete(module.uuid);
                    if (owner.visible()) {
                        finishLoading?.();
                        refreshMarketplace();
                    } else if (
                        owner.current() &&
                        !pageMountController?.signal.aborted
                    ) {
                        void refreshAfterLifecycle(lifecycleOwner());
                    }
                }
                return;
            }
            if (target.classList.contains("module-store-card")) {
                await uiCtx.capabilities.get("ui:navigate")?.(
                    `/administration/modules/${encodeURIComponent(module.uuid)}`,
                );
                return;
            }
        },
        { signal, capture: true },
    );
}

function elements() {
    return [
        {
            id: "module-store",
            label: i18n.t("ui.reuse.modules"),
            pinned: true,
            gridSize: {
                default: [12, 8],
                min: [6, 5],
                max: "full",
            },
            render: renderStore,
        },
    ];
}

export async function mount(root, { signal } = {}) {
    if (globalThis.__spaRouter && !signal) return;
    pageMountController = replaceMountScope(pageMountController, signal);
    const mountSignal = pageMountController.signal;
    for (const [uuid, owner] of pendingActionOwners) {
        if (!owner.current()) {
            pendingActionOwners.delete(uuid);
            pendingModuleActions.delete(uuid);
        }
    }
    pageAuthority = captureModuleAuthority();
    const current = pageAuthority;
    modules = [];
    selectedModule = null;
    discoverySequence++;
    marketplaceEtag = undefined;
    marketplaceSourceRevision = undefined;
    const finishPageLoading = beginPageLoading();
    try {
        pageRoot = root;
        const mountI18n = await createI18n({
            componentStringBaseUrls: ["/static/app/modules/languages"],
        });
        if (mountSignal.aborted || !current()) return;
        i18n = mountI18n;
        const owner = lifecycleOwner(mountSignal);
        applyDocumentTitle(i18n, "ui.page.title.modules");
        composer = createPageComposer(root, {
            tutorials: guides,
            allowCustomization: false,
            subPageNavigation: true,
            preferenceKey: "administration-modules-layout",
            i18n,
            pageContext: {
                title: i18n.t("ui.reuse.modules"),
                subtitle: i18n.t("ui.app.modules.subtitle"),
            },
            elements: elements(),
            toolbar: [
                {
                    id: "module-navigation",
                    label: i18n.t("ui.reuse.navigation"),
                    render: () => renderSidebar([]),
                },
            ],
            floatingMenu: [
                {
                    id: "module-actions",
                    label: i18n.t("ui.reuse.actions"),
                    render: () => "",
                },
            ],
            signal: mountSignal,
        });
        await composer.init();
        if (mountSignal.aborted || !current()) return;
        bindInteractions(root, mountSignal);
        refreshScreenshotCarousels = initializeScreenshotCarousels(
            root,
            mountSignal,
            screenshotIndexes,
        );
        await loadKnownModules(true, mountSignal).catch((error) =>
            reportModuleStateReadFailure(error, owner),
        );
        startMarketplacePolling(mountSignal);
    } finally {
        finishPageLoading();
    }
}

await mountWhenDirect(mount);
