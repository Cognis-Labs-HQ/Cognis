import { showToast } from "/static/reuse/toast.js";
import { deleteLibraryEntries } from "/static/gateways/study/ui/library-client.js";
import { applyLibraryFilters } from "./filters.js";
import { activateLibraryLayer, renderBrowser } from "./layer-cards.js";
import { openEntryPopup } from "./entry-popup.js";
import {
    confirmEntryDeletion,
    selectAllVisibleEntries,
    selectedEntryIds,
    selectionForCard,
    setSelectionMode,
    updateDeleteSelectionButton,
} from "./selection.js";
import {
    bindVariantInteractions,
    closeUnrelatedVariantViews,
} from "./variants.js";

let activeEntryPopup = null;

export function bindLibraryInteractions(root, context) {
    const { i18n, languageCode, requestedLayer, schemas, signal } = context;
    let entries = context.entries;
    let suppressEntryClick = false;
    bindVariantInteractions(root, {
        signal,
        suppressNextClick: () => {
            suppressEntryClick = true;
        },
    });
    root.addEventListener(
        "contextmenu",
        (event) => {
            const card = event.target.closest("button[data-library-entry]");
            if (!card) return;
            const selection = selectionForCard(root, card);
            if (!selection) return;
            event.preventDefault();
            setSelectionMode(root, true, i18n);
            selection.checked = true;
            updateDeleteSelectionButton(root, i18n);
        },
        { signal },
    );
    root.addEventListener(
        "change",
        (event) => {
            if (!event.target.matches("[data-library-select-entry]")) return;
            if (
                root.classList.contains("library-selection-mode") &&
                selectedEntryIds(root).length === 0
            ) {
                setSelectionMode(root, false, i18n);
                return;
            }
            updateDeleteSelectionButton(root, i18n);
        },
        { signal },
    );
    root.addEventListener(
        "click",
        (event) => {
            if (event.target.closest("[data-library-select-all]")) {
                selectAllVisibleEntries(root, i18n);
                return;
            }
            if (event.target.closest("[data-library-selection-close]")) {
                setSelectionMode(root, false, i18n);
                return;
            }
            if (event.target.closest("[data-library-delete-selection]")) {
                void deleteSelection();
                return;
            }
            if (event.target.matches("[data-library-select-entry]")) return;
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
            const control = event.target.closest("button[data-library-entry]");
            if (!control) return;
            if (suppressEntryClick) {
                suppressEntryClick = false;
                return;
            }
            if (closeUnrelatedVariantViews(root, control)) return;
            if (root.classList.contains("library-selection-mode")) {
                setSelectionMode(root, false, i18n);
            }
            const entry = entries.find(
                (candidate) => candidate.id === control.dataset.libraryEntry,
            );
            if (!entry || activeEntryPopup) return;
            activeEntryPopup = openEntryPopup(
                root,
                entry,
                schemas,
                entries,
                i18n,
                languageCode,
                signal,
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

    async function deleteSelection() {
        const request = await confirmEntryDeletion(root, entries, i18n);
        if (!request) return;
        try {
            const deletion = await deleteLibraryEntries(request.entryIds, {
                blacklistContentHashes: request.blacklistContentHashes,
            });
            entries = entries.filter(
                (entry) => !deletion.entryIds.includes(entry.id),
            );
            root.querySelector(".library-browser").innerHTML = renderBrowser(
                schemas,
                entries,
                i18n,
                requestedLayer,
            );
            setSelectionMode(root, false, i18n);
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
