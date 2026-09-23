import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { createSideMenu } from "/static/reuse/side-menu.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { loadLibrary } from "./data.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import { isAdminScope } from "/static/gateways/study/ui/language.js";
import { adminLayerGroups, renderAdminBrowser } from "./admin-browser.js";
import { bindAdminLibraryInteractions } from "./admin-interactions.js";
import { refreshLibraryFilterResults } from "./filters.js";
import { bindLibraryInteractions } from "./interactions.js";
import { openCreateEntryPopup } from "./create-entry.js";
import { librarySelectionFloatingMenu, setSelectionMode } from "./selection.js";
import {
    bindLibraryRequestReviews,
    loadLibraryRequests,
    renderLibraryRequests,
} from "./requests.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/library/languages",
        ],
    });
    applyDocumentTitle(i18n, "gateway.study.library_label");
    if (!isAdminScope()) {
        await navigateTo("/study");
        return;
    }
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: readSelectedStudyLanguageCode(),
    });
    const languageCode = model.selectedLanguageCode;
    const { schemas, entries: loadedEntries } = await loadLibrary(
        languageCode,
        i18n,
    );
    let entries = loadedEntries;
    const requests = await loadLibraryRequests();
    const firstLayer = schemas
        .flatMap((schema) =>
            schema.layers.map((layer) => ({
                schemaId: schema.id,
                layerId: layer.id,
            })),
        )
        .at(0);
    let selectedLayer = firstLayer;
    let searchQuery = "";
    const visibleEntries = () => {
        const query = searchQuery.trim().normalize().toLocaleLowerCase();
        if (!query) return entries;
        return entries.filter((entry) =>
            `${entry.label} ${JSON.stringify(entry.fields ?? {})}`
                .normalize()
                .toLocaleLowerCase()
                .includes(query),
        );
    };
    const renderSelectedLayer = () => {
        const browser = root.querySelector(".library-browser");
        if (browser)
            browser.innerHTML = renderAdminBrowser(
                schemas,
                visibleEntries(),
                i18n,
                searchQuery ? null : selectedLayer,
            );
        const createButton = root.querySelector("[data-library-create]");
        if (createButton)
            createButton.hidden = !schemas
                .find(({ id }) => id === selectedLayer?.schemaId)
                ?.layers.find(({ id }) => id === selectedLayer?.layerId)
                ?.cardConstructor;
    };
    const layerMenu = createSideMenu({
        groups: adminLayerGroups(schemas),
        storageKeyPrefix: "study-library-admin-layer",
        activeId: firstLayer
            ? `${firstLayer.schemaId}:${firstLayer.layerId}`
            : "",
        onSelect: (id) => {
            setSelectionMode(root, false);
            const separator = id.indexOf(":");
            selectedLayer = {
                schemaId: id.slice(0, separator),
                layerId: id.slice(separator + 1),
            };
            renderSelectedLayer();
        },
    });
    const composer = createPageComposer(root, {
        allowCustomization: false,
        contentScrolling: false,
        elements: [
            {
                id: "study-library",
                label: i18n.t("gateway.study.library_label"),
                pinned: true,
                width: "fill",
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () =>
                    `<section class="library-browser">${renderAdminBrowser(schemas, entries, i18n, selectedLayer)}</section>`,
            },
        ],
        preferenceKey: "study-library-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_label"),
            subtitle: i18n.t("gateway.study.library_subtitle"),
        },
        toolbar: [
            {
                id: "library-layers",
                label: i18n.t("gateway.study.library_layers"),
                render: () =>
                    `<label class="library-quick-search"><span>${escapeHtml(i18n.t("gateway.study.library_search"))}</span><span class="library-quick-search-control"><input type="text" inputmode="search" data-library-quick-search placeholder="${escapeHtml(i18n.t("gateway.study.library_search_placeholder"))}"><button class="btn-neutral" type="button" data-library-clear-search aria-label="${escapeHtml(i18n.t("gateway.study.library_search_clear"))}"><img src="/static/adapters/study/library/assets/clear-search.svg" alt=""></button></span></label>${layerMenu.render()}`,
            },
            {
                id: "library-create",
                label: i18n.t("gateway.study.library_create"),
                render: () =>
                    `<button class="btn-confirm" type="button" data-library-create>${escapeHtml(i18n.t("gateway.study.library_create"))}</button>`,
            },
            {
                id: "library-requests",
                label: i18n.t("gateway.study.library_requests"),
                render: () => renderLibraryRequests(requests, i18n),
            },
        ],
        toolbarScrollable: true,
        floatingMenu: librarySelectionFloatingMenu(entries, i18n),
        subNavigation: [
            {
                id: "study-subnav",
                label: i18n.t("gateway.study.page_title"),
                render: () =>
                    renderStudySubNavigation({
                        model,
                        currentPath: window.location.pathname,
                        i18n,
                    }),
            },
        ],
    });
    await composer.init();
    signal?.throwIfAborted();
    layerMenu.mount(root, { signal });
    renderSelectedLayer();
    bindLibraryRequestReviews(root, requests, { i18n, signal });
    const searchInput = root.querySelector("[data-library-quick-search]");
    const updateSearch = () => {
        searchQuery = searchInput?.value ?? "";
        const matches = visibleEntries();
        root.querySelectorAll("[data-side-menu-item]").forEach((item) => {
            const [schemaId, layerId] = item.dataset.sideMenuItem.split(":");
            item.closest("li").hidden =
                searchQuery.length > 0 &&
                !matches.some(
                    (entry) =>
                        entry.schemaId === schemaId && entry.layer === layerId,
                );
        });
        root.querySelectorAll("[data-side-menu-group]").forEach((group) => {
            group.hidden = !group.querySelector("li:not([hidden])");
        });
        renderSelectedLayer();
    };
    searchInput?.addEventListener("input", updateSearch, { signal });
    root.querySelector("[data-library-clear-search]")?.addEventListener(
        "click",
        () => {
            searchInput.value = "";
            updateSearch();
            searchInput.focus();
        },
        { signal },
    );
    root.querySelectorAll("[data-library-panel]").forEach((panel) => {
        if (panel.querySelector("button[data-library-filter].active")) {
            refreshLibraryFilterResults(panel);
        }
    });
    bindStudySubNavigation(root, { signal });
    root.addEventListener(
        "click",
        async (event) => {
            if (event.target.closest("[data-library-create]")) {
                const created = await openCreateEntryPopup({
                    schemas,
                    entries,
                    schemaId: selectedLayer?.schemaId,
                    layerId: selectedLayer?.layerId,
                    i18n,
                });
                if (created) {
                    entries.push(created);
                    renderSelectedLayer();
                }
                return;
            }
        },
        { signal },
    );
    bindLibraryInteractions(root, {
        entries,
        i18n,
        languageCode,
        requests,
        schemas,
        signal,
        showReferenceTree: true,
        readOnly: true,
        openDetails: false,
        renderContent: (updatedEntries = entries) => {
            entries = updatedEntries;
            return renderAdminBrowser(schemas, entries, i18n, selectedLayer);
        },
    });
    bindAdminLibraryInteractions(root, {
        entries,
        i18n,
        render: renderSelectedLayer,
        schemas,
        signal,
    });
}

await mountWhenDirect(mount);
