import { isOfflineContentMiss } from "/static/gateways/study/offline-content.js";
import { bindDrawingGridPreviews } from "./drawing-grid-preview.js";
import { bindViewedEntries } from "./viewed-entries.js";
import { replaceMountScope } from "/static/reuse/mount-scope.js";
import { showToast } from "/static/reuse/toast.js";
import { fetchLibraryLocations } from "/static/gateways/study/library-client.js";
import { applyLibraryFilters } from "./filters.js";
import { activateLibraryLayer, renderBrowser } from "./layer-cards.js";
import { openEntryPopup } from "./entry-popup.js";
import { loadDrawing } from "./drawing.js";
import {
    bindSelectionEscape,
    deselectAllEntries,
    selectAllVisibleEntries,
    selectedEntryIds,
    selectionForCard,
    setSelectionMode,
    updateSelectionActions,
} from "./selection.js";
import {
    bindVariantInteractions,
    closeUnrelatedVariantViews,
} from "./variants.js";
import { createLibraryVisibilityActions } from "./visibility-actions.js";
import { bindTransformationInteractions } from "./transformation-interactions.js";
import { mergeEntryCollectionUpdate } from "./entry-collection.js";
import { deleteLibrarySelection } from "./deletion-actions.js";
import { bindBrowseControls } from "./browse-controls.js";

let activeEntryPopup = null;
const interactionControllers = new WeakMap();

export function bindLibraryInteractions(root, context) {
    const {
        i18n,
        languageCode,
        openDetails = true,
        requestedLayer,
        readOnly = false,
        schemas,
        showReferenceTree = false,
        signal: ownerSignal,
    } = context;
    const controller = replaceMountScope(
        interactionControllers.get(root),
        ownerSignal,
    );
    interactionControllers.set(root, controller);
    const signal = controller.signal;
    bindSelectionEscape(root, signal);
    bindDrawingGridPreviews(root, signal);
    if (root.querySelector(".library-browser"))
        void bindBrowseControls(root, context.entries, schemas, i18n, signal);
    window.addEventListener(
        "cognis:route-will-change",
        () => controller.abort(),
        { signal, once: true },
    );
    let entries = context.entries;
    const requests = context.requests ?? [];
    let locations;
    const renderEntries = (update = entries) => {
        entries = mergeEntryCollectionUpdate(entries, update);
        root.querySelector(".library-browser").innerHTML =
            context.renderContent?.(entries) ??
            renderBrowser(schemas, entries, i18n, requestedLayer);
    };
    void fetchLibraryLocations()
        .then((value) => {
            if (signal.aborted) return;
            locations = value;
            updateSelectionActions(root, entries, requests, locations);
        })
        .catch((error) => {
            if (signal.aborted || isOfflineContentMiss(error)) return;
            showToast(i18n.t("gateway.study.library_load_error"), {
                variant: "error",
            });
        });
    const visibilityActions = createLibraryVisibilityActions({
        root,
        getEntries: () => entries,
        setEntries: (updated) => {
            entries = updated;
        },
        requests,
        getLocations: () => locations,
        i18n,
        render: renderEntries,
    });
    let suppressEntryClick = false;
    const markViewed = bindViewedEntries(root, () => entries, signal, i18n);
    bindVariantInteractions(root, {
        signal,
        suppressNextClick: () => {
            suppressEntryClick = true;
        },
    });
    bindTransformationInteractions(root, { signal });
    root.addEventListener(
        "contextmenu",
        (event) => {
            const card = event.target.closest("[data-library-entry]");
            if (!card) return;
            const selection = selectionForCard(root, card);
            if (!selection) return;
            event.preventDefault();
            setSelectionMode(root, true);
            selection.checked = true;
            updateSelectionActions(root, entries, requests, locations);
        },
        { capture: true, signal },
    );
    root.addEventListener(
        "change",
        (event) => {
            if (!event.target.matches("[data-library-select-entry]")) return;
            if (
                root.classList.contains("library-selection-mode") &&
                selectedEntryIds(root).length === 0
            ) {
                setSelectionMode(root, false);
                return;
            }
            updateSelectionActions(root, entries, requests, locations);
        },
        { signal },
    );
    root.addEventListener(
        "click",
        async (event) => {
            if (event.target.closest(".library-admin-entry-row")) return;
            const selectAll = event.target.closest("[data-library-select-all]");
            if (selectAll) {
                if (selectAll.dataset.selectionAction === "deselect") {
                    deselectAllEntries(root);
                    return;
                }
                selectAllVisibleEntries(root);
                updateSelectionActions(root, entries, requests, locations);
                return;
            }
            if (event.target.closest("[data-library-delete-selection]")) {
                void deleteSelection();
                return;
            }
            const publish = event.target.closest("[data-library-publish]");
            if (publish && !publish.disabled) {
                void visibilityActions.publish(publish.dataset.libraryPublish);
                return;
            }
            if (event.target.closest("[data-library-withdraw-selection]")) {
                void visibilityActions.withdraw();
                return;
            }
            const move = event.target.closest("[data-library-move-selection]");
            if (move && !move.disabled) {
                void visibilityActions.moveToUser();
                return;
            }
            if (event.target.matches("[data-library-select-entry]")) return;
            if (event.target.closest("[data-library-admin-edit]")) return;
            const filter = event.target.closest("button[data-library-filter]");
            if (filter) {
                applyLibraryFilters(filter);
                return;
            }
            const tab = event.target.closest("button[data-library-tab]");
            if (tab) {
                activateLibraryLayer(
                    tab.closest(".library-schema"),
                    tab.dataset.libraryTab,
                );
                return;
            }
            const control = event.target.closest("[data-library-entry]");
            if (!control) return;
            const closedTransformCard = control.closest(
                ".library-transform-card:not(.library-transform-card--open)",
            );
            if (closedTransformCard) return;
            markViewed(control);
            if (suppressEntryClick) {
                suppressEntryClick = false;
                return;
            }
            if (closeUnrelatedVariantViews(root, control)) return;
            if (root.classList.contains("library-selection-mode")) {
                const selection = selectionForCard(root, control);
                if (selection) {
                    selection.checked = !selection.checked;
                    if (selectedEntryIds(root).length === 0)
                        setSelectionMode(root, false);
                    updateSelectionActions(root, entries, requests, locations);
                }
                return;
            }
            const entry = entries.find(
                (candidate) => candidate.id === control.dataset.libraryEntry,
            );
            const schema = schemas.find(({ id }) => id === entry?.schemaId);
            const layer = schema?.layers.find(({ id }) => id === entry?.layer);
            if (entry && (await loadDrawing(entry, layer, entries, schemas)))
                return;
            if (!openDetails) return;
            if (!entry || activeEntryPopup) return;
            activeEntryPopup = openEntryPopup(
                root,
                entry,
                schemas,
                entries,
                i18n,
                languageCode,
                signal,
                {
                    readOnly,
                    showReferenceTree,
                    onEntryUpdated: renderEntries,
                },
            )
                .catch(() =>
                    showToast(i18n.t("gateway.study.library_load_error"), {
                        variant: "error",
                    }),
                )
                .finally(() => {
                    activeEntryPopup = null;
                });
        },
        { signal },
    );
    signal?.addEventListener("abort", () => setSelectionMode(root, false), {
        once: true,
    });
    async function deleteSelection() {
        await deleteLibrarySelection({
            root,
            entries,
            schemas,
            i18n,
            onDeleted: (updated) => {
                entries = updated;
                renderEntries();
            },
        });
    }
}
