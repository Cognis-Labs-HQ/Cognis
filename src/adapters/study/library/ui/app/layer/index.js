import { exploreLayers } from "/static/gateways/study/reuse/explore.js";
import { openEntryPopup } from "../entry-popup.js";
import { fetchLibraryEntry } from "/static/gateways/study/library-client.js";
import { createSideMenu } from "/static/reuse/side-menu.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    createStudySubNavigationSlot,
} from "/static/gateways/study/sub-navigation.js";
import { loadLibrary } from "../data.js";
import { renderBrowser } from "../layer-cards.js";
import { refreshLibraryFilterResults } from "../filters.js";
import { bindLibraryInteractions } from "../interactions.js";
import { localizedLabel } from "../presentation.js";
import { librarySelectionFloatingMenu } from "../selection.js";
import {
    chooseCreateLayer,
    openCreateEntryPopup,
} from "../create-entry/index.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { loadLibraryRequests } from "../requests.js";
import { fetchLibraryForms } from "/static/gateways/study/library-client.js";
import { canCreateLayerEntries } from "../editability.js";

function requestedLayer() {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (![4, 5].includes(parts.length) || parts[1] !== "explore") return null;
    return {
        language: decodeURIComponent(parts[2]),
        slug: decodeURIComponent(parts[3]),
        entryId: parts[4] ? decodeURIComponent(parts[4]) : null,
    };
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/library/languages",
        ],
    });
    const requested = requestedLayer();
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode:
            requested?.language ?? readSelectedStudyLanguageCode(),
    });
    const languageCode = requested?.language ?? model.selectedLanguageCode;
    const { schemas, entries: loadedEntries } = await loadLibrary(
        languageCode,
        i18n,
    );
    const entries = loadedEntries;
    const browseable = exploreLayers(schemas);
    const selected =
        browseable.find(
            ({ layer }) =>
                (layer.navigationSlug ?? layer.id) === requested?.slug,
        ) ?? (!requested ? browseable[0] : undefined);
    const schema = selected?.schema;
    const layer = selected?.layer;
    const selectedLayer =
        schema && layer
            ? { schemaId: schema.id, layerId: layer.id }
            : { schemaId: "", layerId: "" };
    const menu = createSideMenu({
        groups: [
            {
                id: "explore",
                label: i18n.t("gateway.study.explore"),
                collapsible: false,
                items: browseable.map(({ schema, layer }) => ({
                    id: `${schema.language}/${layer.navigationSlug ?? layer.id}`,
                    label:
                        localizedLabel(
                            layer.metadata,
                            document.documentElement.lang,
                        ) || layer.id,
                })),
            },
        ],
        activeId: selected
            ? `${schema.language}/${layer.navigationSlug ?? layer.id}`
            : "",
        storageKeyPrefix: "study-explore",
        onSelect: (id) => navigateTo(`/study/explore/${id}`),
    });
    const [requests, formContributions] = await Promise.all([
        loadLibraryRequests(i18n),
        fetchLibraryForms(),
    ]);
    const canCreate = Boolean(schema) && canCreateLayerEntries(layer);
    const view = null;
    const title = view
        ? localizedLabel(view.metadata, schema.language) || view.id
        : layer
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
        toolbar: [
            {
                id: "explore-layers",
                label: i18n.t("gateway.study.explore"),
                render: () => menu.render(),
            },
        ],
        toolbarScrollable: true,
        floatingMenu: librarySelectionFloatingMenu(entries, i18n),
        subNavigation: [createStudySubNavigationSlot(model, i18n)],
    });
    await composer.init();
    signal?.throwIfAborted();
    menu.mount(root, { signal });
    root.querySelectorAll("[data-library-panel]").forEach((panel) => {
        if (panel.querySelector("button[data-library-filter].active")) {
            refreshLibraryFilterResults(panel);
        }
    });
    bindStudySubNavigation(root, { signal, i18n });
    if (canCreate) {
        const createButton = document.createElement("button");
        createButton.type = "button";
        createButton.className = "btn-confirm";
        createButton.innerHTML =
            '<span class="library-create-action" aria-hidden="true">+</span>';
        createButton.setAttribute(
            "aria-label",
            i18n.t("gateway.study.library_create"),
        );
        createButton.addEventListener(
            "click",
            async () => {
                const schema = schemas.find(
                    ({ id }) => id === selectedLayer?.schemaId,
                );
                if (!schema) return;
                const layerId = await chooseCreateLayer({
                    schema,
                    contributions: formContributions,
                    preferredLayerId: selectedLayer?.layerId,
                    i18n,
                });
                if (!layerId) return;
                const created = await openCreateEntryPopup({
                    schemas,
                    entries,
                    schemaId: selectedLayer?.schemaId,
                    layerId,
                    i18n,
                    contributions: formContributions,
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
    const requestedEntryId = requested?.entryId ?? history.state?.studyEntryId;
    if (requestedEntryId) {
        const entry =
            entries.find(({ id }) => id === requestedEntryId) ??
            (await fetchLibraryEntry(requestedEntryId)).entry;
        await openEntryPopup(
            root,
            entry,
            schemas,
            entries,
            i18n,
            languageCode,
            signal,
            {
                navigationEntryIds: history.state?.studyEntryIds,
                transformation: history.state?.studyEntryTransformation,
            },
        );
    }
}

await mountWhenDirect(mount);
