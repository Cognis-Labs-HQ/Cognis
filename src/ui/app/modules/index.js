import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { restoreWindowScrollPosition } from "../../reuse/page-composer/dom-position.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { showToast } from "../../reuse/toast.js";
import { renderMarkdown } from "../../reuse/markdown-renderer.js";
import { beginButtonLoading } from "../../reuse/button-loading.js";
import { beginPageLoading } from "../../reuse/page-entry.js";
import { openHamburgerMenu } from "../../reuse/hamburger-menu.js";
import { uiCtx } from "../../reuse/ui-ctx.js";
import {
    installModule,
    loadAvailableModules,
    loadCachedModules,
    loadInstalledModules,
    loadModuleMarketplaceSettings,
    loadModuleSources,
    removeModuleSource,
    saveModuleSource,
    saveModuleMarketplaceSettings,
    setModuleEnabled,
    uninstallModule,
    validateModuleSourceCredential,
} from "./api.js";

let i18n;
let composer;
let pageRoot;
let modules = [];
let sources = [];
let category = "all";
let view = "all";
let selectedModule = null;
let discoverySequence = 0;
let marketplaceRefreshPending = false;
let refreshScreenshotCarousels = () => {};
const selectedBranches = new Map();
const pendingModuleActions = new Map();
const screenshotIndexes = new Map();
const MODULE_ICON_FALLBACK_URL = "/static/assets/reuse/module-icon-unknown.svg";
const STORED_PAT_MASK = "****";

function formatVersion(version) {
    const normalized = String(version ?? "").replace(/^v/, "");
    return normalized ? `v${normalized}` : "";
}

function detailModuleUuid() {
    const match = window.location.pathname.match(
        /^\/administration\/modules\/([^/]+)\/?$/,
    );
    return match ? decodeURIComponent(match[1]) : null;
}

function renderAvailableVersion(module) {
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

function renderCard(module) {
    const avatarUrl = resolveModuleAssetUrl(module.assets?.icon);
    const avatar = avatarUrl
        ? `<img class="module-store-avatar module-picture" src="${escapeHtml(avatarUrl)}" data-resource-fallback="${MODULE_ICON_FALLBACK_URL}" alt="" loading="lazy" width="64" height="64">`
        : `<img class="module-store-avatar module-picture" src="${MODULE_ICON_FALLBACK_URL}" alt="" loading="lazy" width="64" height="64">`;
    return `<article class="module-store-card" data-module-uuid="${module.uuid}" tabindex="0">
      ${avatar}
      <div class="module-store-card-copy">
        <div class="module-store-card-heading"><h3>${escapeHtml(module.name)}${renderRestartWarning(module)}</h3>${module.recommended ? `<span class="state-pill pill-active">${escapeHtml(i18n.t("ui.app.modules.recommended"))}</span>` : ""}</div>
        <p>${escapeHtml(module.summary ?? module.description ?? "")}</p>
        <span class="module-store-publisher">${escapeHtml(module.publisher ?? "")} · ${escapeHtml(formatVersion(module.installed ? (module.installedVersion ?? module.version) : module.version))}</span>
        ${renderAvailableVersion(module)}
      </div>
      <div class="module-store-card-actions">${renderLifecycleActions(module)}</div>
    </article>`;
}

function renderRestartWarning(module) {
    if (!module.restartRequired) return "";
    const message = escapeHtml(i18n.t("ui.app.modules.restart_required"));
    return `<span class="module-restart-warning" role="img" aria-label="${message}" title="${message}">!</span>`;
}

function renderLifecycleActions(module) {
    if (module.restartRequired) {
        return `<button type="button" class="btn-neutral" disabled>${escapeHtml(i18n.t("ui.app.modules.restart_required"))}</button>`;
    }
    if (!module.installed && !module.status) {
        return renderLifecycleButton(module, "install", "confirm");
    }
    const pendingAction = pendingModuleActions.get(module.uuid);
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
        return `${installedState}${hasModuleUpdate(module) ? renderLifecycleButton(module, "update", "confirm") : ""}${renderLifecycleButton(module, "disable", "cancel")}`;
    }
    return `${installedState}${hasModuleUpdate(module) ? renderLifecycleButton(module, "update", "confirm") : ""}${renderLifecycleButton(module, "enable", "confirm")}${renderLifecycleButton(module, "uninstall", "cancel")}`;
}

function renderLifecycleButton(module, action, consequence) {
    const pendingAction = pendingModuleActions.get(module.uuid);
    const isPending = pendingAction === action;
    const isBlocked = Boolean(pendingAction);
    const channel = [
        ...(module.branches ?? []),
        ...(module.releases ?? []),
    ].find((entry) => entry.name === selectedBranch(module));
    const updateDirection =
        action === "update" && channel?.version
            ? compareVersions(
                  channel.version,
                  module.installedVersion ?? module.version,
              ) < 0
                ? "downgrade"
                : "upgrade"
            : action;
    const labelKey = isPending
        ? updateDirection === "upgrade"
            ? "ui.app.modules.upgrading"
            : updateDirection === "downgrade"
              ? "ui.app.modules.downgrading"
              : "ui.app.modules.installing"
        : `ui.${["upgrade", "downgrade"].includes(updateDirection) ? "app.modules" : "reuse"}.${updateDirection}`;
    return `<button type="button" class="btn-${consequence}${isPending ? " button-loading" : ""}" data-module-${action}="${escapeHtml(module.uuid)}"${isBlocked ? " disabled" : ""}${isPending ? ' aria-busy="true"' : ""}>${escapeHtml(i18n.t(labelKey))}</button>`;
}

function selectedBranch(module) {
    return (
        selectedBranches.get(module.uuid) ??
        module.installedBranch ??
        module.defaultBranch
    );
}

function hasModuleUpdate(module) {
    if (!module.installedVersion && !module.version) return false;
    const branch = [
        ...(module.branches ?? []),
        ...(module.releases ?? []),
    ].find((entry) => entry.name === selectedBranch(module));
    return Boolean(
        branch?.version &&
        branch.version !== (module.installedVersion ?? module.version),
    );
}

function compareVersions(left, right) {
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

function releaseChannels(module) {
    return [...(module.branches ?? []), ...(module.releases ?? [])].filter(
        (channel, index, entries) =>
            entries.findIndex((entry) => entry.name === channel.name) === index,
    );
}

function renderModuleDetails(module) {
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
    const metadata = [...(module.categories ?? []), ...(module.tags ?? [])]
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
    const advanced = module.installed
        ? `<button type="button" class="btn-neutral module-icon-button" data-module-menu="${escapeHtml(module.uuid)}" aria-label="${escapeHtml(i18n.t("ui.app.modules.advanced_options"))}"${pendingModuleActions.has(module.uuid) ? " disabled" : ""}>☰</button>`
        : "";
    return `<article class="module-detail"><div class="module-detail-navigation"><button type="button" class="btn-neutral module-icon-button module-detail-back" data-module-back title="${escapeHtml(i18n.t("ui.reuse.back"))}" aria-label="${escapeHtml(i18n.t("ui.reuse.back"))}"><span class="module-icon module-icon-back" aria-hidden="true"></span></button>${advanced}</div>${bannerUrl ? `<img class="module-detail-banner module-picture" src="${escapeHtml(bannerUrl)}" alt="">` : ""}<header class="module-detail-header"><div><h2>${escapeHtml(module.name)}</h2><p>${escapeHtml(module.summary ?? "")}</p><p class="module-detail-provider"><strong>${escapeHtml(module.publisher ?? "")}</strong></p>${release}${license}<div class="module-detail-metadata">${metadata}</div>${branchSelector}<div class="module-detail-actions">${renderLifecycleActions(module)}</div></div></header>${media ? `<div class="module-detail-media" aria-label="${escapeHtml(i18n.t("ui.app.modules.media"))}">${media}</div>` : ""}${screenshotCarousel}<div class="module-detail-readme">${renderMarkdown(module.readme ?? module.description ?? "")}</div></article>`;
}

function revealLoadedModulePictures(root) {
    if (!root) return;
    root.querySelectorAll(".module-picture").forEach((picture) => {
        if (picture.complete && picture.naturalWidth > 0) {
            picture.classList.add("is-loaded");
        }
    });
}

function updateScreenshotCarousel(carousel, step = 0) {
    const screenshots = [
        ...carousel.querySelectorAll(".module-detail-screenshot"),
    ];
    if (!screenshots.length) return;
    const moduleUuid = carousel.dataset.screenshotCarousel;
    const current = screenshotIndexes.get(moduleUuid) ?? 0;
    const next = (current + step + screenshots.length) % screenshots.length;
    screenshotIndexes.set(moduleUuid, next);
    screenshots.forEach((screenshot, index) => {
        const offset = (index - next + screenshots.length) % screenshots.length;
        screenshot.classList.toggle("is-active", offset === 0);
        screenshot.classList.toggle("is-next", offset === 1);
        screenshot.classList.toggle(
            "is-previous",
            offset === screenshots.length - 1,
        );
        screenshot.setAttribute("aria-hidden", String(offset !== 0));
    });
    carousel.classList.toggle("is-single", screenshots.length === 1);
}

function initializeScreenshotCarousels(root, signal) {
    const refresh = () =>
        root
            .querySelectorAll("[data-screenshot-carousel]")
            .forEach((carousel) => updateScreenshotCarousel(carousel));
    refresh();
    const rotation = window.setInterval(() => {
        root.querySelectorAll(
            "[data-screenshot-carousel]:not(.is-single)",
        ).forEach((carousel) => updateScreenshotCarousel(carousel, 1));
    }, 5000);
    signal?.addEventListener("abort", () => window.clearInterval(rotation), {
        once: true,
    });
    return refresh;
}

function resolveModuleAssetUrl(value) {
    const candidate = String(value ?? "").trim();
    if (candidate.startsWith("/")) return candidate;
    try {
        const parsed = new URL(candidate);
        return parsed.protocol === "https:" ? parsed.toString() : "";
    } catch {
        return "";
    }
}

function modulesForView() {
    return modules.filter((module) => {
        if (!isVisibleMarketplaceModule(module)) return false;
        if (
            view === "installed" &&
            !(
                module.installed ||
                module.status === "enabled" ||
                module.status === "disabled"
            )
        )
            return false;
        if (view === "recommended") return module.recommended;
        if (view === "available") return !module.installed && !module.status;
        return true;
    });
}

function isVisibleMarketplaceModule(module) {
    return module.template !== true;
}

function viewLabel(item) {
    return i18n.t(item === "all" ? "ui.reuse.all" : `ui.app.modules.${item}`);
}

function visibleModules() {
    return modulesForView().filter(
        (module) =>
            category === "all" || (module.tags ?? []).includes(category),
    );
}

function formatTag(tag) {
    return String(tag)
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function renderSidebar(categories) {
    return `<aside class="module-store-sidebar">
      ${["all", "recommended", "installed", "available"].map((item) => `<button type="button" class="btn-neutral${view === item ? " is-active" : ""}" data-store-view="${item}">${escapeHtml(viewLabel(item))}</button>`).join("")}
      <h3>${escapeHtml(i18n.t("ui.app.modules.categories"))}</h3>
      <button type="button" class="btn-neutral${category === "all" ? " is-active" : ""}" data-store-category="all">${escapeHtml(i18n.t("ui.reuse.all"))}</button>
      ${categories.map((item) => `<button type="button" class="btn-neutral${category === item ? " is-active" : ""}" data-store-category="${escapeHtml(item)}">${escapeHtml(formatTag(item))}</button>`).join("")}
    </aside>`;
}

function renderStore() {
    const categories = [
        ...new Set(modulesForView().flatMap((module) => module.tags ?? [])),
    ].sort((left, right) => left.localeCompare(right));
    return `<div class="module-store-layout">
      ${renderSidebar(categories)}
      <section class="module-store-results">
        ${selectedModule ? renderModuleDetails(selectedModule) : `<div class="module-store-toolbar"><h2>${escapeHtml(viewLabel(view))}</h2><div class="module-store-toolbar-actions"><button id="module-source-refresh" class="btn-neutral module-icon-button" type="button" title="${escapeHtml(i18n.t("ui.reuse.refresh"))}" aria-label="${escapeHtml(i18n.t("ui.reuse.refresh"))}"><span class="module-icon module-icon-refresh" aria-hidden="true"></span></button><button id="module-marketplace-settings" class="btn-neutral module-icon-button" type="button" title="${escapeHtml(i18n.t("ui.reuse.settings"))}" aria-label="${escapeHtml(i18n.t("ui.reuse.settings"))}"><span class="module-icon module-icon-settings" aria-hidden="true"></span></button></div></div><div class="module-store-grid">${visibleModules().map(renderCard).join("") || `<p>${escapeHtml(i18n.t("ui.app.modules.empty"))}</p>`}</div>`}
      </section>
    </div>`;
}

function renderSourceManager() {
    const rows = sources
        .map((source) => {
            const controls = source.trusted
                ? `<span class="module-source-actions"><span class="state-pill pill-active">${escapeHtml(i18n.t("ui.app.modules.default_source"))}</span><button class="btn-neutral" type="button" data-edit-source="${escapeHtml(source.uuid)}">${escapeHtml(i18n.t("ui.reuse.edit"))}</button></span>`
                : `<span class="module-source-actions"><button class="btn-neutral" type="button" data-edit-source="${escapeHtml(source.uuid)}">${escapeHtml(i18n.t("ui.reuse.edit"))}</button><button class="btn-cancel" type="button" data-remove-source="${escapeHtml(source.uuid)}">${escapeHtml(i18n.t("ui.reuse.remove"))}</button></span>`;
            return `<li><span class="module-source-summary"><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.homepage ?? `${source.baseUrl}/${source.namespace}`)}</small></span>${controls}</li>`;
        })
        .join("");
    return `<div class="module-source-manager"><p>${escapeHtml(i18n.t("ui.app.modules.sources_description"))}</p><ul class="module-source-list">${rows}</ul><button type="button" class="btn-confirm module-source-add" data-add-source>${escapeHtml(i18n.t("ui.app.modules.add_source"))}</button></div>`;
}

function renderSourceForm(source) {
    const locked = source?.trusted ? " disabled" : "";
    const tokenValue = source?.credentialId ? STORED_PAT_MASK : "";
    return `<form id="module-source-form" class="module-source-form"><label><span>${escapeHtml(i18n.t("ui.reuse.name"))}</span><input name="name" value="${escapeHtml(source?.name ?? "")}" required${locked}></label><label><span>${escapeHtml(i18n.t("ui.app.modules.provider"))}</span><select name="provider"${locked}><option value="github"${source?.provider === "github" ? " selected" : ""}>${escapeHtml(i18n.t("ui.app.modules.github"))}</option><option value="gitlab"${source?.provider === "gitlab" ? " selected" : ""}>${escapeHtml(i18n.t("ui.app.modules.gitlab"))}</option></select></label><label><span>${escapeHtml(i18n.t("ui.app.modules.namespace"))}</span><input name="namespace" value="${escapeHtml(source?.namespace ?? "")}" required${locked}></label><label><span>${escapeHtml(i18n.t("ui.app.modules.base_url"))}</span><input name="baseUrl" type="url" value="${escapeHtml(source?.baseUrl ?? "https://api.github.com")}" required${locked}></label><label><span>${escapeHtml(i18n.t("ui.app.modules.pat"))}</span><input name="token" type="password" autocomplete="off" value="${tokenValue}"></label></form>`;
}

async function openMarketplaceSettings(initialPage = "settings") {
    sources = await loadModuleSources();
    let settings = await loadModuleMarketplaceSettings();
    let selectedSource = null;
    await openPopup({
        title: i18n.t("ui.reuse.settings"),
        maxWidth: "760px",
        pages: [
            {
                id: "settings",
                title: i18n.t("ui.reuse.settings"),
                body: () =>
                    `<form id="module-marketplace-settings-form" class="module-source-form"><label><span>${escapeHtml(i18n.t("ui.app.modules.recommended_url"))}</span><input name="recommendedModulesUrl" type="url" value="${escapeHtml(settings.recommendedModulesUrl)}" required></label></form><section class="module-settings-sources"><h3>${escapeHtml(i18n.t("ui.app.modules.sources"))}</h3>${renderSourceManager()}</section>`,
                actions: [
                    {
                        id: "save-settings",
                        label: i18n.t("ui.reuse.save"),
                        variant: "confirm",
                    },
                ],
            },
            {
                id: "editor",
                title: i18n.t("ui.app.modules.source_details"),
                body: () => renderSourceForm(selectedSource),
                actions: [
                    {
                        id: "back",
                        label: i18n.t("ui.reuse.back"),
                        variant: "neutral",
                    },
                    {
                        id: "save",
                        label: i18n.t("ui.reuse.save"),
                        variant: "confirm",
                    },
                ],
            },
        ],
        initialPageId: initialPage,
        onOpen: (overlay, _close, api) => {
            if (api.pageId !== "settings") return;
            overlay
                .querySelector("[data-add-source]")
                ?.addEventListener("click", () => {
                    selectedSource = null;
                    api.setPage("editor");
                });
            overlay.querySelectorAll("[data-edit-source]").forEach((button) =>
                button.addEventListener("click", () => {
                    selectedSource = sources.find(
                        (source) => source.uuid === button.dataset.editSource,
                    );
                    api.setPage("editor");
                }),
            );
            overlay.querySelectorAll("[data-remove-source]").forEach((button) =>
                button.addEventListener("click", async () => {
                    const result = await openPopup({
                        title: i18n.t("ui.app.modules.remove_source"),
                        body: `<p>${escapeHtml(i18n.t("ui.app.modules.remove_source_confirm"))}</p>`,
                        actions: [
                            {
                                id: "remove",
                                label: i18n.t("ui.reuse.remove"),
                                variant: "cancel",
                            },
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "neutral",
                            },
                        ],
                    });
                    if (result !== "remove") return;
                    await removeModuleSource(button.dataset.removeSource);
                    sources = await loadModuleSources();
                    api.setPage("settings");
                }),
            );
        },
        onAction: async (action, overlay, api) => {
            if (action === "save-settings") {
                const form = overlay.querySelector(
                    "#module-marketplace-settings-form",
                );
                if (!form.reportValidity()) return false;
                settings = await saveModuleMarketplaceSettings(
                    Object.fromEntries(new FormData(form)),
                );
                showToast(i18n.t("ui.app.modules.settings_saved"), {
                    type: "success",
                });
                return true;
            }
            if (action === "back") {
                api.setPage("settings");
                return false;
            }
            if (action !== "save") return true;
            const form = overlay.querySelector("#module-source-form");
            if (!form.reportValidity()) return false;
            const values = Object.fromEntries(new FormData(form));
            const sourceValues = selectedSource?.trusted
                ? selectedSource
                : values;
            const uuid = selectedSource?.uuid ?? crypto.randomUUID();
            const tokenChanged =
                values.token && values.token !== STORED_PAT_MASK;
            const credentialId = tokenChanged
                ? (selectedSource?.credentialId ?? `module-source:${uuid}:pat`)
                : selectedSource?.credentialId;
            if (tokenChanged) {
                const validation = await validateModuleSourceCredential(
                    {
                        uuid,
                        name: sourceValues.name,
                        provider: sourceValues.provider,
                        namespace: sourceValues.namespace,
                        baseUrl: sourceValues.baseUrl,
                    },
                    values.token,
                );
                if (!validation.valid) {
                    showToast(
                        i18n.t("ui.app.modules.credential_validation_warning"),
                        { type: "warning" },
                    );
                    return false;
                }
                const scope = uiCtx.capabilities.get("keyring:forComponent")?.(
                    i18n.t("ui.app.modules.keyring_component"),
                );
                await scope?.set(credentialId, values.token, {
                    label: sourceValues.name,
                    source: sourceValues.provider,
                });
            }
            await saveModuleSource({
                uuid,
                name: sourceValues.name,
                provider: sourceValues.provider,
                namespace: sourceValues.namespace,
                baseUrl: sourceValues.baseUrl,
                credentialId,
            });
            sources = await loadModuleSources();
            showToast(i18n.t("ui.app.modules.source_saved"), {
                type: "success",
            });
            api.setPage("settings");
            return false;
        },
    });
}

async function selectReleaseChannel(module) {
    const channels = releaseChannels(module);
    let selectedChannel = module.installedBranch ?? selectedBranch(module);
    const result = await openPopup({
        title: i18n.t("ui.app.modules.change_release_channel"),
        body: `<div class="module-release-channel-list" role="radiogroup" aria-label="${escapeHtml(i18n.t("ui.app.modules.release_channel"))}">${channels.map((channel) => `<button type="button" class="btn-neutral${channel.name === selectedChannel ? " is-active" : ""}" data-release-channel="${escapeHtml(channel.name)}" aria-pressed="${channel.name === selectedChannel}">${escapeHtml(channel.name)}${channel.version ? ` · ${escapeHtml(formatVersion(channel.version))}` : ""}</button>`).join("")}</div>`,
        actions: [
            {
                id: "confirm",
                label: i18n.t("ui.reuse.confirm"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onOpen: (overlay) => {
            overlay
                .querySelectorAll("[data-release-channel]")
                .forEach((button) =>
                    button.addEventListener("click", () => {
                        selectedChannel = button.dataset.releaseChannel;
                        overlay
                            .querySelectorAll("[data-release-channel]")
                            .forEach((entry) => {
                                const active = entry === button;
                                entry.classList.toggle("is-active", active);
                                entry.setAttribute(
                                    "aria-pressed",
                                    String(active),
                                );
                            });
                    }),
                );
        },
    });
    return result === "confirm" ? selectedChannel : null;
}

async function runLifecycleAction(module, action) {
    if (module.restartRequired) return;
    if (
        ["install", "update", "force-update", "change-channel"].includes(action)
    ) {
        let branch = selectedBranch(module);
        if (action === "change-channel") {
            const releaseChannel = await selectReleaseChannel(module);
            if (!releaseChannel) return;
            if (releaseChannel === module.installedBranch) return;
            branch = releaseChannel;
        }
        const restoreEnabledState =
            ["update", "force-update", "change-channel"].includes(action) &&
            module.status === "enabled";
        const channel = [
            ...(module.branches ?? []),
            ...(module.releases ?? []),
        ].find((entry) => entry.name === branch);
        if (
            module.installed &&
            channel?.version &&
            compareVersions(
                channel.version,
                module.installedVersion ?? module.version,
            ) < 0
        ) {
            const result = await openPopup({
                title: i18n.t("ui.app.modules.downgrade_title"),
                body: escapeHtml(i18n.t("ui.app.modules.downgrade_warning")),
                variant: "warning",
                actions: [
                    {
                        id: "confirm",
                        label: i18n.t("ui.app.modules.downgrade"),
                        variant: "cancel",
                    },
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "neutral",
                    },
                ],
            });
            if (result !== "confirm") return;
        }
        const source = sources.find(
            (entry) => entry.uuid === module.sourceUuid,
        );
        const keyring = uiCtx.capabilities.get("keyring:forComponent")?.(
            i18n.t("ui.app.modules.keyring_component"),
        );
        const token = source?.credentialId
            ? keyring?.get(source.credentialId)
            : undefined;
        if (restoreEnabledState) {
            await setModuleEnabled(module.id, false);
        }
        try {
            const installedManifest = await installModule(
                module,
                token,
                branch,
                restoreEnabledState,
            );
            module.version = installedManifest.version;
            module.restartRequired = installedManifest.restartRequired;
        } finally {
            if (restoreEnabledState && !module.restartRequired) {
                await setModuleEnabled(module.id, true);
                module.status = "enabled";
            }
        }
        module.installed = true;
        if (module.restartRequired || !restoreEnabledState) {
            module.status = "disabled";
        }
        module.installedBranch = branch;
        module.installedCommit = [
            ...(module.branches ?? []),
            ...(module.releases ?? []),
        ].find((entry) => entry.name === branch)?.commit;
        module.installedVersion = module.version;
        module.updateAvailable = false;
        selectedBranches.set(module.uuid, branch);
    }
    if (action === "enable" || action === "disable") {
        await setModuleEnabled(module.id, action === "enable");
        module.status = action === "enable" ? "enabled" : "disabled";
    }
    if (action === "uninstall") {
        await uninstallModule(module.uuid);
        module.installed = false;
        delete module.status;
    }
    selectedModule =
        selectedModule?.uuid === module.uuid ? module : selectedModule;
    refreshMarketplace();
    window.dispatchEvent(
        new CustomEvent("cognis:module-lifecycle-changed", {
            detail: {
                action,
                moduleId: module.id,
                moduleUuid: module.uuid,
                status: module.status ?? "available",
            },
        }),
    );
    window.dispatchEvent(new Event("cognis:navbar-plugins-refresh"));
    window.dispatchEvent(new Event("cognis:navbar-refresh"));
    showToast(i18n.t(`ui.app.modules.${action}_complete`), { type: "success" });
    if (module.restartRequired) {
        showToast(i18n.t("ui.app.modules.restart_required"), {
            type: "warning",
        });
    }
    void loadKnownModules().catch((error) => {
        showToast(error.message, { type: "error" });
    });
}

function refreshMarketplace() {
    const scrollPosition = {
        left: window.scrollX,
        top: window.scrollY,
    };
    composer?.refreshElements(["module-store"]);
    revealLoadedModulePictures(pageRoot);
    refreshScreenshotCarousels();
    restoreWindowScrollPosition(scrollPosition.left, scrollPosition.top);
}

async function loadKnownModules() {
    const [loadedSources, installed, cached] = await Promise.all([
        loadModuleSources(),
        loadInstalledModules(),
        loadCachedModules(),
    ]);
    sources = loadedSources;
    modules = [...cached];
    installed.forEach((installedModule) => {
        const known = modules.find(
            (module) => module.uuid === installedModule.uuid,
        );
        if (known) {
            const catalogPresentation = {
                name: known.name,
                summary: known.summary,
                description: known.description,
                assets: known.assets,
            };
            Object.assign(known, installedModule, { installed: true });
            Object.assign(known, catalogPresentation);
        } else {
            modules.push(installedModule);
        }
    });
    const requestedModuleUuid = detailModuleUuid();
    selectedModule = requestedModuleUuid
        ? (modules.find(
              (module) =>
                  module.uuid === requestedModuleUuid &&
                  isVisibleMarketplaceModule(module),
          ) ?? null)
        : null;
    refreshMarketplace();
}

async function discoverConfiguredSources() {
    const sequence = ++discoverySequence;
    const keyring = uiCtx.capabilities.get("keyring:forComponent")?.(
        i18n.t("ui.app.modules.keyring_component"),
    );
    const tokens = Object.fromEntries(
        sources
            .filter((source) => source.credentialId)
            .map((source) => [
                source.credentialId,
                keyring?.get(source.credentialId) ?? "",
            ]),
    );
    const discovered = await loadAvailableModules(
        tokens,
        sources.map((source) => source.uuid),
    );
    if (sequence !== discoverySequence) return;
    {
        const knownUuids = new Set(modules.map((module) => module.uuid));
        discovered.forEach((module) => {
            const known = modules.find((entry) => entry.uuid === module.uuid);
            if (known) {
                const status = known.status;
                Object.assign(known, module);
                if (status) known.status = status;
            } else if (!knownUuids.has(module.uuid)) {
                modules.push(module);
            }
        });
        refreshMarketplace();
    }
}

async function refreshMarketplaceData() {
    await loadKnownModules();
    await discoverConfiguredSources();
}

function bindInteractions(root, signal) {
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
        (event) => {
            const selector = event.target.closest("[data-module-branch]");
            if (!selector) return;
            selectedBranches.set(selector.dataset.moduleBranch, selector.value);
            refreshMarketplace();
        },
        { signal },
    );
    root.addEventListener(
        "keydown",
        (event) => {
            if (!["Enter", " "].includes(event.key)) return;
            const card = event.target.closest(".module-store-card");
            if (!card || event.target.closest("button")) return;
            event.preventDefault();
            card.click();
        },
        { signal },
    );
    root.addEventListener(
        "click",
        async (event) => {
            const target =
                event.target.closest("button") ??
                event.target.closest(".module-store-card");
            if (!target) return;
            if (target.dataset.screenshotStep) {
                updateScreenshotCarousel(
                    target.closest("[data-screenshot-carousel]"),
                    Number(target.dataset.screenshotStep),
                );
                return;
            }
            if (target.dataset.storeView) view = target.dataset.storeView;
            if (target.dataset.storeView) category = "all";
            if (target.dataset.storeCategory)
                category = target.dataset.storeCategory;
            if (target.dataset.storeView || target.dataset.storeCategory)
                selectedModule = null;
            if (target.id === "module-marketplace-settings") {
                await openMarketplaceSettings();
                return;
            }
            if (target.id === "module-source-refresh") {
                if (marketplaceRefreshPending) return;
                marketplaceRefreshPending = true;
                target.disabled = true;
                try {
                    await refreshMarketplaceData();
                    selectedModule = null;
                    refreshMarketplace();
                    showToast(i18n.t("ui.app.modules.refresh_complete"), {
                        type: "success",
                    });
                } catch (error) {
                    showToast(error.message, { type: "error" });
                    target.disabled = false;
                } finally {
                    marketplaceRefreshPending = false;
                }
                return;
            }
            if (target.hasAttribute("data-module-back")) {
                await uiCtx.capabilities.get("ui:navigate")?.(
                    "/administration/modules",
                );
                return;
            }
            let action = [
                "install",
                "update",
                "force-update",
                "change-channel",
                "enable",
                "disable",
                "uninstall",
            ].find((name) => target.hasAttribute(`data-module-${name}`));
            const moduleUuid = target.dataset.moduleMenu
                ? target.dataset.moduleMenu
                : action
                  ? target.getAttribute(`data-module-${action}`)
                  : target.dataset.moduleUuid;
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
                if (pendingModuleActions.has(module.uuid)) return;
                pendingModuleActions.set(module.uuid, action);
                const finishLoading = beginButtonLoading(target);
                refreshMarketplace();
                try {
                    await runLifecycleAction(module, action);
                } catch (error) {
                    console.error("module_lifecycle_action_failed", {
                        action,
                        moduleId: module.id,
                        moduleUuid: module.uuid,
                        error,
                    });
                    showToast(
                        error.code === "github_connection_timeout"
                            ? i18n.t("ui.app.modules.github_timeout_warning")
                            : error.code === "module_install_timeout"
                              ? i18n.t("ui.app.modules.install_timeout")
                              : error.message,
                        { type: "error" },
                    );
                } finally {
                    pendingModuleActions.delete(module.uuid);
                    finishLoading();
                    refreshMarketplace();
                }
                return;
            }
            if (target.classList.contains("module-store-card")) {
                await uiCtx.capabilities.get("ui:navigate")?.(
                    `/administration/modules/${encodeURIComponent(module.uuid)}`,
                );
                return;
            }
            refreshMarketplace();
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
    const finishPageLoading = beginPageLoading();
    try {
        pageRoot = root;
        i18n = await createI18n();
        applyDocumentTitle(i18n, "ui.page.title.modules");
        composer = createPageComposer(root, {
            allowCustomization: false,
            preferenceKey: "administration-modules-layout",
            i18n,
            pageContext: {
                title: i18n.t("ui.reuse.modules"),
                subtitle: i18n.t("ui.app.modules.subtitle"),
            },
            elements: elements(),
            signal,
        });
        await composer.init();
        bindInteractions(root, signal);
        refreshScreenshotCarousels = initializeScreenshotCarousels(
            root,
            signal,
        );
        void loadKnownModules().catch((error) => {
            showToast(error.message, { type: "error" });
        });
    } finally {
        finishPageLoading();
    }
}

await mount(document.querySelector("#app"));
