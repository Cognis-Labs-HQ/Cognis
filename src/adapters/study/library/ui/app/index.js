import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { createSideMenu } from "/static/reuse/side-menu.js";
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
import { canDeleteEntry } from "./selection.js";

function libraryFloatingMenu(entries, i18n, isAdminDataView) {
    if (!isAdminDataView || !entries.some(canDeleteEntry)) return [];
    return [
        {
            id: "library-selection-actions",
            label: i18n.t("ui.reuse.actions"),
            render: () =>
                `<button class="btn-neutral library-selection-action" type="button" data-library-select-all>${escapeHtml(i18n.t("gateway.study.library_select_all"))}</button><button class="btn-cancel library-selection-action" type="button" data-library-delete-selection disabled>${escapeHtml(i18n.t("gateway.study.library_delete_selected"))}</button><button class="btn-neutral library-selection-action library-selection-close" type="button" data-library-selection-close aria-label="${escapeHtml(i18n.t("ui.reuse.close"))}">×</button>`,
        },
    ];
}

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
    const firstLayer = schemas
        .flatMap((schema) =>
            schema.layers.map((layer) => ({
                schemaId: schema.id,
                layerId: layer.id,
            })),
        )
        .at(0);
    let selectedLayer = firstLayer;
    const renderSelectedLayer = () => {
        const browser = root.querySelector(".library-browser");
        if (browser)
            browser.innerHTML = renderAdminBrowser(
                schemas,
                entries,
                i18n,
                selectedLayer,
            );
    };
    const layerMenu = createSideMenu({
        groups: adminLayerGroups(schemas),
        storageKeyPrefix: "study-library-admin-layer",
        activeId: firstLayer
            ? `${firstLayer.schemaId}:${firstLayer.layerId}`
            : "",
        onSelect: (id) => {
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
                render: () => layerMenu.render(),
            },
        ],
        toolbarScrollable: true,
        floatingMenu: libraryFloatingMenu(entries, i18n, true),
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
    root.querySelectorAll("[data-library-panel]").forEach((panel) => {
        if (panel.querySelector("button[data-library-filter].active")) {
            refreshLibraryFilterResults(panel);
        }
    });
    bindStudySubNavigation(root, { signal });
    bindLibraryInteractions(root, {
        entries,
        i18n,
        languageCode,
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
