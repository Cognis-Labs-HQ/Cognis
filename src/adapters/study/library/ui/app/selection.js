import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { isAdminScope } from "/static/gateways/study/ui/language.js";

export function canDeleteEntry(entry) {
    return (
        entry.protected !== true && (entry.canDelete === true || isAdminScope())
    );
}

export function librarySelectionFloatingMenu(entries, i18n) {
    if (!entries.some(canDeleteEntry)) return [];
    return [
        {
            id: "library-selection-actions",
            label: i18n.t("ui.reuse.actions"),
            render: () =>
                `<button class="btn-neutral library-selection-action" type="button" data-library-select-all>${escapeHtml(i18n.t("gateway.study.library_select_all"))}</button><button class="btn-confirm library-selection-action" type="button" data-library-promote-selection disabled>${escapeHtml(i18n.t("gateway.study.library_request_promotion"))}</button><button class="btn-neutral library-selection-action" type="button" data-library-downgrade-selection disabled>${escapeHtml(i18n.t("gateway.study.library_move_personal"))}</button><button class="btn-cancel library-selection-action" type="button" data-library-delete-selection disabled>${escapeHtml(i18n.t("gateway.study.library_delete_selected"))}</button><button class="btn-neutral library-selection-action library-selection-close" type="button" data-library-selection-close aria-label="${escapeHtml(i18n.t("ui.reuse.close"))}">×</button>`,
        },
    ];
}

export function selectedEntryIds(root) {
    return Array.from(
        root.querySelectorAll("[data-library-select-entry]:checked"),
        (control) => control.dataset.librarySelectEntry,
    );
}

export function selectionForCard(root, card) {
    return Array.from(
        root.querySelectorAll("[data-library-select-entry]"),
    ).find(
        (control) =>
            control.dataset.librarySelectEntry === card.dataset.libraryEntry,
    );
}

export function updateDeleteSelectionButton(root, i18n) {
    const button = root.querySelector("[data-library-delete-selection]");
    if (!button) return;
    const count = selectedEntryIds(root).length;
    button.disabled = count === 0;
    button.textContent = i18n.t("ui.reuse.delete");
    root.querySelectorAll(
        "[data-library-promote-selection], [data-library-downgrade-selection]",
    ).forEach((control) => {
        control.disabled = count !== 1;
    });
}

export function setSelectionMode(root, enabled, i18n) {
    root.classList.toggle("library-selection-mode", enabled);
    if (!enabled) {
        root.querySelectorAll("[data-library-select-entry]").forEach(
            (selection) => {
                selection.checked = false;
            },
        );
    }
    const floatingActions = root.querySelector(
        '[data-floating-slot="library-selection-actions"]',
    );
    if (floatingActions) floatingActions.hidden = !enabled;
    updateDeleteSelectionButton(root, i18n);
}

export function selectAllVisibleEntries(root, i18n) {
    root.querySelectorAll(
        "[data-library-panel]:not([hidden]) .library-entry-card-shell:not([hidden]) [data-library-select-entry]",
    ).forEach((selection) => {
        selection.checked = true;
    });
    updateDeleteSelectionButton(root, i18n);
}

export async function confirmEntryDeletion(
    root,
    libraryEntries,
    schemas,
    i18n,
) {
    const entryIds = selectedEntryIds(root);
    if (entryIds.length === 0) return null;
    const cascadeIds = new Set(entryIds);
    let changed = true;
    while (changed) {
        changed = false;
        for (const entry of libraryEntries) {
            const sourceLayer = schemas
                .find(
                    (schema) =>
                        schema.id === entry.schemaId &&
                        schema.version === entry.schemaVersion,
                )
                ?.layers.find((layer) => layer.id === entry.layer);
            if (
                !cascadeIds.has(entry.id) &&
                entry.references?.some(
                    (reference) =>
                        cascadeIds.has(reference.entryId) &&
                        sourceLayer?.relationships?.find(
                            (relationship) =>
                                relationship.id === reference.relation,
                        )?.onDelete === "cascade",
                )
            ) {
                cascadeIds.add(entry.id);
                changed = true;
            }
        }
    }
    const selectedIds = new Set(entryIds);
    const cascadeEntries = libraryEntries.filter(
        (entry) => cascadeIds.has(entry.id) && !selectedIds.has(entry.id),
    );
    const cascadeWarning = cascadeEntries.length
        ? `<p>${escapeHtml(i18n.t("gateway.study.library_delete_warning"))}</p><ul class="library-delete-cascade-list">${cascadeEntries.map((entry) => `<li>${escapeHtml(entry.label)}</li>`).join("")}</ul>`
        : "";
    let blacklistContentHashes = false;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_delete_title"),
        body: `${cascadeWarning}<label class="library-delete-permanent"><input type="checkbox" data-library-blacklist-content> ${escapeHtml(i18n.t("gateway.study.library_delete_permanent"))}</label>`,
        variant: "warning",
        actions: [
            {
                id: "delete",
                label: i18n.t("ui.reuse.delete"),
                variant: "cancel",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onAction(selectedAction, overlay) {
            if (selectedAction !== "delete") return;
            blacklistContentHashes = overlay.querySelector(
                "[data-library-blacklist-content]",
            ).checked;
        },
    });
    return action === "delete" ? { entryIds, blacklistContentHashes } : null;
}
