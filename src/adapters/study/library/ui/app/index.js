import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import {
    fetchLibraryEntries,
    fetchLibrarySchemas,
} from "/static/gateways/study/ui/library-client.js";
import { isAdminScope } from "/static/gateways/study/ui/language.js";
import { renderBrowser } from "./layer-cards.js";
import { refreshLibraryFilterResults } from "./filters.js";
import { bindLibraryInteractions } from "./interactions.js";
import { canDeleteEntry } from "./selection.js";

async function loadLibrary(languageCode, i18n) {
    let schemas = [];
    let entries = [];
    try {
        schemas = await fetchLibrarySchemas(languageCode);
        const accountId = localStorage.getItem("cognis_account");
        const locations = [
            { scope: "global" },
            ...(accountId ? [{ scope: "user", scopeId: accountId }] : []),
        ];
        entries = (
            await Promise.all(
                schemas.flatMap((schema) =>
                    locations.map((location) =>
                        fetchLibraryEntries({
                            ...location,
                            schemaId: schema.id,
                        }),
                    ),
                ),
            )
        ).flat();
    } catch {
        showToast(i18n.t("gateway.study.library_load_error"), {
            type: "error",
        });
    }
    return { schemas, entries };
}

function libraryFloatingMenu(entries, i18n, isAdminDataView) {
    if (!isAdminDataView || !entries.some(canDeleteEntry)) return [];
    return [
        {
            id: "library-selection-actions",
            label: i18n.t("ui.reuse.actions"),
            render: () =>
                `<button class="btn-neutral library-selection-action" type="button" data-library-select-all>${escapeHtml(i18n.t("ui.reuse.select_all"))}</button><button class="btn-cancel library-selection-action" type="button" data-library-delete-selection disabled>${escapeHtml(i18n.t("ui.reuse.delete"))}</button><button class="btn-neutral library-selection-action library-selection-close" type="button" data-library-selection-close aria-label="${escapeHtml(i18n.t("ui.reuse.close"))}">X</button>`,
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
    const routeParts = window.location.pathname.split("/").filter(Boolean);
    const requestedLayer =
        routeParts.length >= 4
            ? { schemaId: routeParts[2], layerId: routeParts[3] }
            : null;
    const isAdminDataView = routeParts.length === 2;
    if (isAdminDataView && !isAdminScope()) {
        await navigateTo("/study");
        return;
    }
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: readSelectedStudyLanguageCode(),
    });
    const languageCode = model.selectedLanguageCode;
    const { schemas, entries } = await loadLibrary(languageCode, i18n);
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
                    `<section class="library-browser">${renderBrowser(schemas, entries, i18n, requestedLayer)}</section>`,
            },
        ],
        preferenceKey: "study-library-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_label"),
            subtitle: i18n.t("gateway.study.library_subtitle"),
        },
        toolbar: [],
        floatingMenu: libraryFloatingMenu(entries, i18n, isAdminDataView),
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
        requestedLayer,
        schemas,
        signal,
    });
}

await mountWhenDirect(mount);
