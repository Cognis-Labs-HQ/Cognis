import { showToast } from "/static/reuse/toast.js";
import {
    deleteLibraryEntries,
    fetchLibraryLocations,
    markLibraryEntriesViewed,
    moveLibraryEntryToPersonal,
    requestLibraryPromotion,
} from "/static/gateways/study/ui/library-client.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
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
        (event) => markViewed(event.target.closest("[data-library-entry]")),
        { signal },
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
            if (event.target.closest("[data-library-promote-selection]")) {
                void promoteSelection();
                return;
            }
            if (event.target.closest("[data-library-downgrade-selection]")) {
                void downgradeSelection();
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
                    updateDeleteSelectionButton(root, i18n);
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

    async function promoteSelection() {
        const [entryId] = selectedEntryIds(root);
        const entry = entries.find(({ id }) => id === entryId);
        if (!entry || entry.protected || entry.scope !== "user") return;
        const { readable } = await fetchLibraryLocations();
        const destinations = readable.filter(
            ({ scope }) => scope === "class" || scope === "global",
        );
        let select;
        const action = await openPopup({
            title: i18n.t("gateway.study.library_request_promotion"),
            body: `<label>${escapeHtml(i18n.t("gateway.study.library_visibility"))}<select data-library-promotion-destination>${destinations.map((location) => `<option value="${escapeHtml(`${location.scope}:${location.scopeId ?? location.scope}`)}">${escapeHtml(location.scope === "class" ? location.scopeId : i18n.t("gateway.study.library_scope_global"))}</option>`).join("")}</select></label>`,
            actions: [
                {
                    id: "submit",
                    label: i18n.t("gateway.study.library_submit_request"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "neutral",
                },
            ],
            onMount: (overlay) => {
                select = overlay.querySelector(
                    "[data-library-promotion-destination]",
                );
            },
        });
        if (action !== "submit" || !select?.value) return;
        const [scope, scopeId] = select.value.split(":");
        await requestLibraryPromotion(entry.id, { scope, scopeId });
        setSelectionMode(root, false, i18n);
    }

    async function downgradeSelection() {
        const [entryId] = selectedEntryIds(root);
        const entry = entries.find(({ id }) => id === entryId);
        if (!entry || entry.protected || entry.scope === "user") return;
        const moved = await moveLibraryEntryToPersonal(entry.id);
        entries = entries.filter(({ id }) => id !== entry.id);
        if (moved.scopeId === localStorage.getItem("cognis_account"))
            entries.push(moved);
        root.querySelector(".library-browser").innerHTML =
            context.renderContent?.(entries) ??
            renderBrowser(schemas, entries, i18n, requestedLayer);
        setSelectionMode(root, false, i18n);
    }
}
