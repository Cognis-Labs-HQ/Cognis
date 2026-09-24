import { showToast } from "/static/reuse/toast.js";
import {
    deleteLibraryEntries,
    fetchLibraryLocations,
    markLibraryEntriesViewed,
} from "/static/gateways/study/ui/library-client.js";
import { applyLibraryFilters } from "./filters.js";
import { activateLibraryLayer, renderBrowser } from "./layer-cards.js";
import { openEntryPopup } from "./entry-popup.js";
import {
    confirmEntryDeletion,
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

let activeEntryPopup = null;

export function bindLibraryInteractions(root, context) {
    const {
        i18n,
        languageCode,
        openDetails = true,
        requestedLayer,
        readOnly = false,
        schemas,
        showReferenceTree = false,
        signal,
    } = context;
    let entries = context.entries;
    const requests = context.requests ?? [];
    let locations;
    void fetchLibraryLocations().then((value) => {
        locations = value;
        updateSelectionActions(root, entries, requests, locations);
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
        render: (updated) => {
            root.querySelector(".library-browser").innerHTML =
                context.renderContent?.(updated) ??
                renderBrowser(schemas, updated, i18n, requestedLayer);
        },
    });
    let suppressEntryClick = false;
    const markViewed = (control) => {
        const entry = entries.find(
            ({ id }) => id === control?.dataset.libraryEntry,
        );
        if (!entry?.isNew) return;
        entry.isNew = false;
        root.querySelectorAll(
            `[data-library-entry="${CSS.escape(entry.id)}"]`,
        ).forEach((card) =>
            card
                .closest(".library-entry-card-shell")
                ?.querySelector(".library-new-pill")
                ?.remove(),
        );
        void markLibraryEntriesViewed([entry.id]).catch(() => {
            entry.isNew = true;
        });
    };
    root.addEventListener(
        "pointerover",
        (event) => {
            const status = event.target.closest("[data-library-entry-status]");
            const control = event.target.closest("[data-library-entry]");
            markViewed(
                control ??
                    (status
                        ? {
                              dataset: {
                                  libraryEntry:
                                      status.dataset.libraryEntryStatus,
                              },
                          }
                        : null),
            );
        },
        { capture: true, signal },
    );
    bindVariantInteractions(root, {
        signal,
        suppressNextClick: () => {
            suppressEntryClick = true;
        },
    });
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
        (event) => {
            if (event.target.closest("[data-library-select-all]")) {
                if (selectAllVisibleEntries(root))
                    updateSelectionActions(root, entries, requests, locations);
                return;
            }
            if (event.target.closest("[data-library-delete-selection]")) {
                void deleteSelection();
                return;
            }
            const publish = event.target.closest("[data-library-publish]");
            if (publish) {
                void visibilityActions.publish(publish.dataset.libraryPublish);
                return;
            }
            if (event.target.closest("[data-library-withdraw-selection]")) {
                void visibilityActions.withdraw();
                return;
            }
            if (event.target.closest("[data-library-send-back-selection]")) {
                void visibilityActions.sendBack();
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
            const openedAsNew = entries.some(
                ({ id, isNew }) =>
                    id === control.dataset.libraryEntry && isNew === true,
            );
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
                { readOnly, showReferenceTree, showNew: openedAsNew },
            )
                .catch(() =>
                    showToast(i18n.t("gateway.study.library_load_error"), {
                        type: "error",
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
        const request = await confirmEntryDeletion(
            root,
            entries,
            schemas,
            i18n,
        );
        if (!request) return;
        try {
            const deletion = await deleteLibraryEntries(request.entryIds, {
                blacklistContentHashes: request.blacklistContentHashes,
            });
            entries = entries.filter(
                (entry) => !deletion.entryIds.includes(entry.id),
            );
            root.querySelector(".library-browser").innerHTML =
                context.renderContent?.(entries) ??
                renderBrowser(schemas, entries, i18n, requestedLayer);
            setSelectionMode(root, false);
            showToast(i18n.t("gateway.study.library_delete_success"), {
                variant: "success",
            });
        } catch {
            showToast(i18n.t("gateway.study.library_delete_error"), {
                variant: "error",
            });
        }
    }
}
