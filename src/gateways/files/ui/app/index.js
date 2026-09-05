import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

const CATEGORIES = ["all", "favorites", "recent", "shared", "trash"];

function fileElement(state) {
    return {
        id: "files-browser",
        label: state.i18n.t("gateway.files.page_title"),
        pinned: true,
        gridSize: { default: [12, 10], min: [8, 6], max: ["fill", "fill"] },
        render: () => `
            <div class="files-layout">
                <aside class="files-sidebar" aria-label="${escapeHtml(state.i18n.t("gateway.files.locations"))}">
                    <nav>${CATEGORIES.map((category) => `<button type="button" class="files-category btn-neutral${state.category === category ? " active" : ""}" data-category="${category}">${escapeHtml(state.i18n.t(`gateway.files.category.${category}`))}</button>`).join("")}</nav>
                    <section><h3>${escapeHtml(state.i18n.t("gateway.files.folders"))}</h3>
                        ${state.data.folders.map((folder) => `<button type="button" class="files-folder btn-neutral" data-folder="${folder.id}">📁 ${escapeHtml(folder.name)}</button>`).join("")}
                        <button type="button" class="files-new-folder btn-confirm">＋ ${escapeHtml(state.i18n.t("gateway.files.new_folder"))}</button>
                    </section>
                    <hr><section><h3>${escapeHtml(state.i18n.t("gateway.files.providers"))}</h3>${state.data.providers.map((provider) => `<button type="button" class="files-provider btn-neutral active" data-provider="${provider.id}">◉ ${escapeHtml(provider.name)}</button>`).join("")}</section>
                </aside>
                <main class="files-main">
                    <div class="files-namespaces" role="group" aria-label="${escapeHtml(state.i18n.t("gateway.files.namespaces"))}">
                        <button class="files-namespace btn-neutral active" data-namespace="">${escapeHtml(state.i18n.t("gateway.files.all_namespaces"))}</button>
                        ${state.data.namespaces.map((namespace) => `<button class="files-namespace btn-neutral" data-namespace="${escapeHtml(namespace.id)}">${escapeHtml(namespace.id)}</button>`).join("")}
                    </div>
                    <div class="files-grid">${state.filtered.map((entry) => `<article class="file-card" tabindex="0" data-key="${escapeHtml(entry.key)}" data-namespace="${escapeHtml(entry.namespaceId)}"><span class="file-icon">📄</span><strong>${escapeHtml(entry.key.split("/").pop())}</strong><small>${escapeHtml(entry.namespaceId)} · ${entry.size} B</small></article>`).join("") || `<p>${escapeHtml(state.i18n.t("gateway.files.empty"))}</p>`}</div>
                    <menu class="files-context" hidden><button type="button" data-action="open" class="btn-neutral">${escapeHtml(state.i18n.t("gateway.files.open"))}</button><button type="button" data-action="open-with" class="btn-neutral">${escapeHtml(state.i18n.t("gateway.files.open_with"))}</button><button type="button" data-action="favorite" class="btn-neutral">${escapeHtml(state.i18n.t("gateway.files.favorite"))}</button><button type="button" data-action="share" class="btn-neutral">${escapeHtml(state.i18n.t("gateway.files.share"))}</button><button type="button" data-action="delete" class="btn-cancel">${escapeHtml(state.i18n.t("gateway.files.delete"))}</button></menu>
                </main>
            </div>`,
    };
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/files/languages"],
    });
    applyDocumentTitle(i18n, "gateway.files.page_title");
    const client = uiCtx.capabilities.get("files:uiClient");
    const data = await client.listLibrary();
    const state = {
        i18n,
        data,
        category: "all",
        namespace: "",
        folder: "",
        filtered: data.entries,
    };
    const composer = createPageComposer(root, {
        i18n,
        preferenceKey: "files-layout",
        pageContext: {
            title: i18n.t("gateway.files.page_title"),
            subtitle: i18n.t("gateway.files.page_subtitle"),
        },
        elements: [fileElement(state)],
    });
    await composer.init();
    const refresh = () => {
        state.filtered = data.entries.filter(
            (entry) =>
                (!state.namespace || entry.namespaceId === state.namespace) &&
                (!state.folder || entry.folderId === state.folder) &&
                (state.category === "all" ||
                    (state.category === "favorites" && entry.favorite) ||
                    (state.category === "recent" && entry.lastOpenedAt) ||
                    (state.category === "shared" && entry.shared)),
        );
        composer.refresh([fileElement(state)]);
        bind();
    };
    let selected = null;
    const bind = () => {
        root.querySelectorAll("[data-category]").forEach((button) =>
            button.addEventListener(
                "click",
                () => {
                    state.category = button.dataset.category;
                    state.folder = "";
                    refresh();
                },
                { signal },
            ),
        );
        root.querySelectorAll("[data-namespace]").forEach((button) =>
            button.addEventListener(
                "click",
                () => {
                    state.namespace = button.dataset.namespace;
                    refresh();
                },
                { signal },
            ),
        );
        root.querySelectorAll("[data-folder]").forEach((button) =>
            button.addEventListener(
                "click",
                () => {
                    state.folder = button.dataset.folder;
                    refresh();
                },
                { signal },
            ),
        );
        root.querySelector(".files-new-folder")?.addEventListener(
            "click",
            async () => {
                const name = prompt(i18n.t("gateway.files.folder_prompt"));
                if (name) {
                    await client.createFolder(name, state.namespace || "user");
                    Object.assign(data, await client.listLibrary());
                    refresh();
                }
            },
            { signal },
        );
        const menu = root.querySelector(".files-context");
        root.querySelectorAll(".file-card").forEach((card) =>
            card.addEventListener(
                "contextmenu",
                (event) => {
                    event.preventDefault();
                    selected = card;
                    menu.hidden = false;
                    menu.style.left = `${event.clientX}px`;
                    menu.style.top = `${event.clientY}px`;
                },
                { signal },
            ),
        );
        menu?.querySelectorAll("[data-action]").forEach((button) =>
            button.addEventListener(
                "click",
                async () => {
                    if (!selected) return;
                    const namespaceId = selected.dataset.namespace;
                    const key = selected.dataset.key;
                    if (button.dataset.action === "favorite") {
                        const entry = data.entries.find(
                            (item) =>
                                item.namespaceId === namespaceId &&
                                item.key === key,
                        );
                        entry.favorite = !entry.favorite;
                        await client.updateEntry(namespaceId, key, {
                            favorite: entry.favorite,
                        });
                        refresh();
                    }
                    if (
                        button.dataset.action === "open" ||
                        button.dataset.action === "open-with"
                    ) {
                        await client.updateEntry(namespaceId, key, {
                            opened: true,
                        });
                        const rendererId =
                            button.dataset.action === "open-with"
                                ? prompt(
                                      i18n.t("gateway.files.renderer_prompt"),
                                  )
                                : undefined;
                        await uiCtx.capabilities.get("file-render:open")?.({
                            namespaceId,
                            key,
                            rendererId,
                        });
                    }
                    if (button.dataset.action === "share") {
                        uiCtx.capabilities.get("share:openPopup")?.({
                            resourceType: "file",
                            resourceId: `${namespaceId}/${key}`,
                            contentUrl: client.resolveNamespacedFileUrl(
                                namespaceId,
                                key,
                            ),
                            grantedCapabilities: ["files:read", "files:write"],
                            supportsReadOnly: true,
                        });
                    }
                    if (
                        button.dataset.action === "delete" &&
                        confirm(i18n.t("gateway.files.delete_confirm"))
                    ) {
                        await fetch(
                            client.resolveNamespacedFileUrl(namespaceId, key),
                            {
                                method: "DELETE",
                                headers: {
                                    authorization: `Bearer ${localStorage.getItem("cognis_access_token")}`,
                                },
                            },
                        );
                        data.entries = data.entries.filter(
                            (entry) =>
                                entry.namespaceId !== namespaceId ||
                                entry.key !== key,
                        );
                        refresh();
                    }
                    menu.hidden = true;
                },
                { signal },
            ),
        );
        window.addEventListener(
            "click",
            () => {
                if (menu) menu.hidden = true;
            },
            { signal },
        );
    };
    bind();
}

await mountWhenDirect(mount);
