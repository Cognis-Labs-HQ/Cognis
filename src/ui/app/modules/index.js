import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { showToast } from "../../reuse/toast.js";
import { uiCtx } from "../../reuse/ui-ctx.js";
import {
    installModule,
    loadAvailableModules,
    loadInstalledModules,
    loadModuleSources,
    removeModuleSource,
    saveModuleSource,
} from "./api.js";

let i18n;
let composer;
let modules = [];
let sources = [];
let category = "all";
let view = "recommended";

function renderCard(module) {
    const avatar = module.assets?.avatar
        ? `<img class="module-store-avatar" src="${escapeHtml(module.assets.avatar)}" alt="" loading="lazy">`
        : `<span class="module-store-avatar module-store-avatar--fallback">${escapeHtml(module.name.slice(0, 1))}</span>`;
    return `<article class="module-store-card">
      ${avatar}
      <div class="module-store-card-copy">
        <div class="module-store-card-heading"><h3>${escapeHtml(module.name)}</h3>${module.recommended ? `<span class="state-pill pill-active">${escapeHtml(i18n.t("ui.app.modules.recommended"))}</span>` : ""}</div>
        <p>${escapeHtml(module.summary ?? module.description ?? "")}</p>
        <span class="module-store-publisher">${escapeHtml(module.publisher ?? "")} · ${escapeHtml(module.version)}</span>
      </div>
      <button type="button" class="${module.installed || module.status === "enabled" ? "btn-neutral" : "btn-confirm"}" data-module-action="${module.uuid}">${escapeHtml(i18n.t(module.installed || module.status === "enabled" ? "ui.reuse.installed" : "ui.reuse.install"))}</button>
    </article>`;
}

function visibleModules() {
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
        if (view === "recommended" && !module.recommended) return false;
        return category === "all" || module.categories?.includes(category);
    });
}

function renderStore() {
    const categories = [
        ...new Set(modules.flatMap((module) => module.categories ?? [])),
    ];
    return `<div class="module-store-layout">
      <aside class="module-store-sidebar">
        ${["recommended", "installed", "available"].map((item) => `<button type="button" class="btn-neutral${view === item ? " is-active" : ""}" data-store-view="${item}">${escapeHtml(i18n.t(`ui.app.modules.${item}`))}</button>`).join("")}
        <h3>${escapeHtml(i18n.t("ui.app.modules.categories"))}</h3>
        <button type="button" class="btn-neutral${category === "all" ? " is-active" : ""}" data-store-category="all">${escapeHtml(i18n.t("ui.reuse.all"))}</button>
        ${categories.map((item) => `<button type="button" class="btn-neutral${category === item ? " is-active" : ""}" data-store-category="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}
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
        body: `<ul class="module-source-list">${rows}</ul><form id="module-source-form" class="stack"><label>${escapeHtml(i18n.t("ui.reuse.name"))}<input name="name" required></label><label>${escapeHtml(i18n.t("ui.app.modules.provider"))}<select name="provider"><option value="github">${escapeHtml(i18n.t("ui.app.modules.github"))}</option><option value="gitlab">${escapeHtml(i18n.t("ui.app.modules.gitlab"))}</option></select></label><label>${escapeHtml(i18n.t("ui.app.modules.namespace"))}<input name="namespace" required></label><label>${escapeHtml(i18n.t("ui.app.modules.base_url"))}<input name="baseUrl" type="url" value="https://api.github.com" required></label><label>${escapeHtml(i18n.t("ui.app.modules.pat"))}<input name="token" type="password" autocomplete="off"></label></form>`,
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

function bind() {
    document.querySelectorAll("[data-store-view]").forEach((button) =>
        button.addEventListener("click", () => {
            view = button.dataset.storeView;
            composer.refresh(elements());
        }),
    );
    document.querySelectorAll("[data-store-category]").forEach((button) =>
        button.addEventListener("click", () => {
            category = button.dataset.storeCategory;
            composer.refresh(elements());
        }),
    );
    document
        .querySelector("#module-source-settings")
        ?.addEventListener("click", openSourceSettings);
    document.querySelectorAll("[data-module-action]").forEach((button) =>
        button.addEventListener("click", async () => {
            const module = modules.find(
                (entry) => entry.uuid === button.dataset.moduleAction,
            );
            if (!module || module.installed || module.status) return;
            button.disabled = true;
            try {
                const source = sources.find(
                    (entry) => entry.uuid === module.sourceUuid,
                );
                const keyring = uiCtx.capabilities.get(
                    "keyring:forComponent",
                )?.(i18n.t("ui.app.modules.keyring_component"));
                const token = source?.credentialId
                    ? keyring?.get(source.credentialId)
                    : undefined;
                await installModule(module, token);
                module.installed = true;
                showToast(i18n.t("ui.app.modules.installed"), {
                    type: "success",
                });
                composer.refresh(elements());
            } catch (error) {
                showToast(error.message, { type: "error" });
                button.disabled = false;
            }
        }),
    );
}

function elements() {
    return [
        {
            id: "module-store",
            label: i18n.t("ui.reuse.modules"),
            pinned: true,
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
        onRender: bind,
        signal,
    });
    await composer.init();
}

await mountWhenDirect(mount);
