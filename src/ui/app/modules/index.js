import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { showToast } from "../../reuse/toast.js";
import { renderMarkdown } from "../../reuse/markdown-renderer.js";
import { uiCtx } from "../../reuse/ui-ctx.js";
import {
    installModule,
    loadAvailableModules,
    loadInstalledModules,
    loadModuleSources,
    removeModuleSource,
    saveModuleSource,
    setModuleEnabled,
    uninstallModule,
} from "./api.js";

let i18n;
let composer;
let modules = [];
let sources = [];
let category = "all";
let view = "recommended";
let selectedModule = null;

function renderCard(module) {
    const avatarUrl = resolveModuleAssetUrl(module.assets?.icon);
    const avatar = avatarUrl
        ? `<img class="module-store-avatar" src="${escapeHtml(avatarUrl)}" alt="" loading="lazy">`
        : `<span class="module-store-avatar module-store-avatar--fallback">${escapeHtml(module.name.slice(0, 1))}</span>`;
    return `<article class="module-store-card" data-module-uuid="${module.uuid}" tabindex="0">
      ${avatar}
      <div class="module-store-card-copy">
        <div class="module-store-card-heading"><h3>${escapeHtml(module.name)}</h3>${module.recommended ? `<span class="state-pill pill-active">${escapeHtml(i18n.t("ui.app.modules.recommended"))}</span>` : ""}</div>
        <p>${escapeHtml(module.summary ?? module.description ?? "")}</p>
        <span class="module-store-publisher">${escapeHtml(module.publisher ?? "")} · ${escapeHtml(module.version)}</span>
      </div>
      <div class="module-store-card-actions">${renderLifecycleActions(module)}</div>
    </article>`;
}

function renderLifecycleActions(module) {
    if (!module.installed && !module.status) {
        return `<button type="button" class="btn-confirm" data-module-install="${module.uuid}">${escapeHtml(i18n.t("ui.reuse.install"))}</button>`;
    }
    if (module.status === "enabled") {
        return `<button type="button" class="btn-cancel" data-module-disable="${module.uuid}">${escapeHtml(i18n.t("ui.reuse.disable"))}</button>`;
    }
    return `<button type="button" class="btn-confirm" data-module-enable="${module.uuid}">${escapeHtml(i18n.t("ui.reuse.enable"))}</button><button type="button" class="btn-cancel" data-module-uninstall="${module.uuid}">${escapeHtml(i18n.t("ui.reuse.uninstall"))}</button>`;
}

function renderModuleDetails(module) {
    const bannerUrl = resolveModuleAssetUrl(module.assets?.banner);
    const screenshots = (module.assets?.screenshots ?? [])
        .map(
            (url) =>
                `<img class="module-detail-screenshot" src="${escapeHtml(resolveModuleAssetUrl(url))}" alt="" loading="lazy">`,
        )
        .join("");
    const metadata = [
        module.publisher,
        module.version,
        module.license,
        ...(module.categories ?? []),
        ...(module.tags ?? []),
    ]
        .filter(Boolean)
        .map((value) => `<span>${escapeHtml(value)}</span>`)
        .join("");
    return `<article class="module-detail">${bannerUrl ? `<img class="module-detail-banner" src="${escapeHtml(bannerUrl)}" alt="">` : ""}<header class="module-detail-header"><button type="button" class="btn-neutral" data-module-back>${escapeHtml(i18n.t("ui.app.modules.back_to_modules"))}</button><div><h2>${escapeHtml(module.name)}</h2><p>${escapeHtml(module.summary ?? "")}</p><div class="module-detail-metadata">${metadata}</div><div class="module-detail-actions">${renderLifecycleActions(module)}</div></div></header>${screenshots ? `<div class="module-detail-screenshots">${screenshots}</div>` : ""}<div class="module-detail-readme">${renderMarkdown(module.readme ?? module.description ?? "")}</div></article>`;
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

function renderStore() {
    if (selectedModule) return renderModuleDetails(selectedModule);
    const categories = [
        ...new Set(modulesForView().flatMap((module) => module.tags ?? [])),
    ].sort((left, right) => left.localeCompare(right));
    return `<div class="module-store-layout">
      <aside class="module-store-sidebar">
        ${["recommended", "installed", "available"].map((item) => `<button type="button" class="btn-neutral${view === item ? " is-active" : ""}" data-store-view="${item}">${escapeHtml(i18n.t(`ui.app.modules.${item}`))}</button>`).join("")}
        <h3>${escapeHtml(i18n.t("ui.app.modules.categories"))}</h3>
        <button type="button" class="btn-neutral${category === "all" ? " is-active" : ""}" data-store-category="all">${escapeHtml(i18n.t("ui.reuse.all"))}</button>
        ${categories.map((item) => `<button type="button" class="btn-neutral${category === item ? " is-active" : ""}" data-store-category="${escapeHtml(item)}">${escapeHtml(formatTag(item))}</button>`).join("")}
      </aside>
      <section class="module-store-results">
        <div class="module-store-toolbar"><h2>${escapeHtml(i18n.t(`ui.app.modules.${view}`))}</h2><button id="module-source-settings" class="btn-neutral" type="button">${escapeHtml(i18n.t("ui.app.modules.sources"))}</button></div>
        <div class="module-store-grid">${visibleModules().map(renderCard).join("") || `<p>${escapeHtml(i18n.t("ui.app.modules.empty"))}</p>`}</div>
      </section>
    </div>`;
}

async function openSourceSettings() {
    const rows = sources
        .map(
            (source) =>
                `<li>${escapeHtml(source.name)} <button class="btn-cancel" type="button" data-remove-source="${escapeHtml(source.uuid)}">${escapeHtml(i18n.t("ui.reuse.remove"))}</button></li>`,
        )
        .join("");
    await openPopup({
        title: i18n.t("ui.app.modules.sources"),
        body: `<div class="module-source-manager"><ul class="module-source-list">${rows}</ul><form id="module-source-form" class="module-source-form"><label><span>${escapeHtml(i18n.t("ui.reuse.name"))}</span><input name="name" required></label><label><span>${escapeHtml(i18n.t("ui.app.modules.provider"))}</span><select name="provider"><option value="github">${escapeHtml(i18n.t("ui.app.modules.github"))}</option><option value="gitlab">${escapeHtml(i18n.t("ui.app.modules.gitlab"))}</option></select></label><label><span>${escapeHtml(i18n.t("ui.app.modules.namespace"))}</span><input name="namespace" required></label><label><span>${escapeHtml(i18n.t("ui.app.modules.base_url"))}</span><input name="baseUrl" type="url" value="https://api.github.com" required></label><label><span>${escapeHtml(i18n.t("ui.app.modules.pat"))}</span><input name="token" type="password" autocomplete="off"></label></form></div>`,
        actions: [
            { id: "save", label: i18n.t("ui.reuse.save"), variant: "confirm" },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onMount(overlay) {
            overlay.querySelectorAll("[data-remove-source]").forEach((button) =>
                button.addEventListener("click", async () => {
                    await removeModuleSource(button.dataset.removeSource);
                    sources = await loadModuleSources();
                    button.closest("li")?.remove();
                }),
            );
        },
        onAction: async (action, overlay) => {
            if (action !== "save") return true;
            const form = overlay.querySelector("#module-source-form");
            if (!form.reportValidity()) return false;
            const values = Object.fromEntries(new FormData(form));
            const uuid = crypto.randomUUID();
            let credentialId;
            if (values.token) {
                credentialId = `module-source:${uuid}:pat`;
                const scope = uiCtx.capabilities.get("keyring:forComponent")?.(
                    i18n.t("ui.app.modules.keyring_component"),
                );
                await scope?.set(credentialId, values.token, {
                    label: values.name,
                    source: values.provider,
                });
            }
            await saveModuleSource({
                uuid,
                name: values.name,
                provider: values.provider,
                namespace: values.namespace,
                baseUrl: values.baseUrl,
                credentialId,
            });
            sources = await loadModuleSources();
            showToast(i18n.t("ui.app.modules.source_saved"), {
                type: "success",
            });
            return true;
        },
    });
}

async function runLifecycleAction(module, action) {
    if (action === "install") {
        const source = sources.find(
            (entry) => entry.uuid === module.sourceUuid,
        );
        const keyring = uiCtx.capabilities.get("keyring:forComponent")?.(
            i18n.t("ui.app.modules.keyring_component"),
        );
        const token = source?.credentialId
            ? keyring?.get(source.credentialId)
            : undefined;
        await installModule(module, token);
        module.installed = true;
        module.status = "disabled";
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
    showToast(i18n.t(`ui.app.modules.${action}_complete`), { type: "success" });
    composer.refresh(elements());
}

function bindInteractions(root, signal) {
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
            if (target.dataset.storeView) view = target.dataset.storeView;
            if (target.dataset.storeView) category = "all";
            if (target.dataset.storeCategory)
                category = target.dataset.storeCategory;
            if (target.id === "module-source-settings") {
                await openSourceSettings();
                return;
            }
            if (target.hasAttribute("data-module-back")) selectedModule = null;
            const action = ["install", "enable", "disable", "uninstall"].find(
                (name) => target.hasAttribute(`data-module-${name}`),
            );
            const moduleUuid = action
                ? target.dataset[
                      `module${action[0].toUpperCase()}${action.slice(1)}`
                  ]
                : target.dataset.moduleUuid;
            const module = modules.find((entry) => entry.uuid === moduleUuid);
            if (action && module) {
                target.disabled = true;
                try {
                    await runLifecycleAction(module, action);
                } catch (error) {
                    showToast(error.message, { type: "error" });
                    target.disabled = false;
                }
                return;
            }
            if (target.classList.contains("module-store-card")) {
                selectedModule = module;
            }
            composer.refresh(elements());
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
    i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.modules");
    const [loadedSources, installed] = await Promise.all([
        loadModuleSources(),
        loadInstalledModules(),
    ]);
    sources = loadedSources;
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
    const available = sources.length ? await loadAvailableModules(tokens) : [];
    const installedUuids = new Set(installed.map((module) => module.uuid));
    modules = [
        ...installed,
        ...available.filter((module) => !installedUuids.has(module.uuid)),
    ];
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
}

await mountWhenDirect(mount);
