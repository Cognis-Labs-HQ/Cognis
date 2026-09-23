import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import { loadLibrary } from "../data.js";
import { renderBrowser } from "../layer-cards.js";
import { refreshLibraryFilterResults } from "../filters.js";
import { bindLibraryInteractions } from "../interactions.js";
import { localizedLabel } from "../presentation.js";
import { librarySelectionFloatingMenu } from "../selection.js";
import { openCreateEntryPopup } from "../create-entry.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { loadLibraryRequests } from "../requests.js";

function requestedLayer() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts.length !== 4 || parts[1] !== "layers") return null;
    return {
        schemaId: decodeURIComponent(parts[2]),
        layerId: decodeURIComponent(parts[3]),
    };
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/library/languages",
        ],
    });
    const selectedLayer = requestedLayer();
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: readSelectedStudyLanguageCode(),
    });
    const languageCode = model.selectedLanguageCode;
    const { schemas, entries: loadedEntries } = await loadLibrary(
        languageCode,
        i18n,
    );
    const entries = loadedEntries;
    const schema = schemas.find(({ id }) => id === selectedLayer?.schemaId);
    const layer = schema?.layers?.find(
        ({ id }) => id === selectedLayer?.layerId,
    );
    const requests = await loadLibraryRequests();
    const title = layer
        ? localizedLabel(layer.metadata, schema.language) || layer.id
        : i18n.t("gateway.study.library_label");
    applyDocumentTitle(i18n, "gateway.study.library_label");
    const composer = createPageComposer(root, {
        allowCustomization: false,
        contentScrolling: false,
        elements: [
            {
                id: "study-library-layer",
                label: title,
                pinned: true,
                width: "fill",
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () =>
                    `<section class="library-browser">${renderBrowser(schemas, entries, i18n, selectedLayer)}</section>`,
            },
        ],
        preferenceKey: "study-library-layer-layout",
        i18n,
        pageContext: {
            title,
            subtitle: i18n.t("gateway.study.library_subtitle"),
        },
        toolbar: [],
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
    root.querySelectorAll("[data-library-panel]").forEach((panel) => {
        if (panel.querySelector("button[data-library-filter].active")) {
            refreshLibraryFilterResults(panel);
        }
    });
    bindStudySubNavigation(root, { signal });
    if (layer?.cardConstructor) {
        const createButton = document.createElement("button");
        createButton.type = "button";
        createButton.className = "btn-confirm";
        createButton.textContent = "+";
        createButton.setAttribute(
            "aria-label",
            i18n.t("gateway.study.library_create"),
        );
        createButton.addEventListener(
            "click",
            async () => {
                const created = await openCreateEntryPopup({
                    schemas,
                    entries,
                    schemaId: selectedLayer?.schemaId,
                    layerId: selectedLayer?.layerId,
                    i18n,
                });
                if (!created) return;
                entries.push(created);
                root.querySelector(".library-browser").innerHTML =
                    renderBrowser(schemas, entries, i18n, selectedLayer);
            },
            { signal },
        );
        const removeAction = uiCtx.capabilities.get("page:actions")?.add({
            id: "study-library:create",
            element: createButton,
            order: 20,
        });
        signal?.addEventListener("abort", () => removeAction?.(), {
            once: true,
        });
    }
    bindLibraryInteractions(root, {
        entries,
        i18n,
        languageCode,
        requests,
        requestedLayer: selectedLayer,
        schemas,
        signal,
    });
}

await mountWhenDirect(mount);
