import { planLibraryEntryDeletion } from "/static/gateways/study/ui/library-client.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { renderScope } from "./presentation.js";

export function canDeleteEntry(entry) {
    return entry.protected !== true && entry.canDelete === true;
}

export function librarySelectionFloatingMenu(entries, i18n) {
    if (entries.length === 0) return [];
    return [
        {
            id: "library-selection-actions",
            label: i18n.t("ui.reuse.actions"),
            render: () => `
                <button class="btn-neutral library-selection-action" type="button" data-library-select-all data-selection-action="select"
                    data-select-label="${escapeHtml(i18n.t("gateway.study.library_select_all"))}"
                    data-deselect-label="${escapeHtml(i18n.t("gateway.study.library_deselect_all"))}">
                    ${escapeHtml(i18n.t("gateway.study.library_select_all"))}
                </button>
                <span class="library-relocate-actions" data-library-relocate-actions role="group" aria-label="${escapeHtml(i18n.t("gateway.study.library_relocate_to"))}" hidden>
                    ${["global", "class", "user"]
                        .map((scope) => {
                            const label = `${i18n.t("gateway.study.library_relocate_to")} ${i18n.t(`gateway.study.library_destination_${scope}`)}`;
                            const action =
                                scope === "user"
                                    ? "data-library-move-selection"
                                    : `data-library-publish="${scope}"`;
                            return `<button class="btn-confirm" type="button" ${action} title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}" hidden>
                            ${escapeHtml(i18n.t("gateway.study.library_relocate_to"))}
                            ${renderScope({ scope }, i18n, label)}
                        </button>`;
                        })
                        .join("")}
                </span>
                <button class="btn-cancel library-selection-action" type="button" data-library-withdraw-selection hidden>${escapeHtml(i18n.t("gateway.study.library_withdraw"))}</button>
                <button class="btn-cancel library-selection-action" type="button" data-library-delete-selection hidden>${escapeHtml(i18n.t("gateway.study.library_delete_selected"))}</button>`,
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

export function relocationState(selected, destination, requests = []) {
    const ranks = { user: 0, class: 1, global: 2 };
    const directions = selected.map(
        (entry) => ranks[destination] - ranks[entry.scope],
    );
    return {
        applicable: directions.some((direction) => direction !== 0),
        downgrade:
            directions.length > 0 &&
            directions.every((direction) => direction < 0),
        disabled:
            !selected.length ||
            directions.some(
                (direction) => !Number.isFinite(direction) || direction === 0,
            ) ||
            (directions.some((direction) => direction > 0) &&
                directions.some((direction) => direction < 0)) ||
            selected.some(
                (entry) =>
                    !canDeleteEntry(entry) ||
                    requests.some(
                        (request) =>
                            request.sourceEntryId === entry.id &&
                            request.status === "pending",
                    ),
            ),
    };
}

export function updateSelectionActions(root, entries, requests, locations) {
    const ids = selectedEntryIds(root);
    const selected = entries.filter(({ id }) => ids.includes(id));
    const entry = selected.length === 1 ? selected[0] : null;
    const pending = entry
        ? requests.find(
              (request) =>
                  request.sourceEntryId === entry.id && request.canWithdraw,
          )
        : null;
    const hasClasses = (locations?.readable ?? []).some(
        ({ scope }) => scope === "class",
    );
    for (const scope of ["global", "class", "user"]) {
        const button = root.querySelector(
            scope === "user"
                ? "[data-library-move-selection]"
                : `[data-library-publish="${scope}"]`,
        );
        if (!button) continue;
        const state = relocationState(selected, scope, requests);
        button.hidden = !state.applicable || (scope === "class" && !hasClasses);
        button.disabled = state.disabled;
        button.classList.toggle("btn-cancel", state.downgrade);
        button.classList.toggle("btn-confirm", !state.downgrade);
    }
    const withdraw = root.querySelector("[data-library-withdraw-selection]");
    if (withdraw) {
        withdraw.hidden = !pending;
        withdraw.dataset.libraryRequestId = pending?.id ?? "";
    }
    const relocation = root.querySelector("[data-library-relocate-actions]");
    if (relocation)
        relocation.hidden =
            !selected.length || selected.every((entry) => entry.protected);
    const deletion = root.querySelector("[data-library-delete-selection]");
    if (deletion)
        deletion.hidden =
            !selected.length ||
            Boolean(pending) ||
            selected.some((candidate) => !canDeleteEntry(candidate));
    const selectAll = root.querySelector("[data-library-select-all]");
    if (selectAll) {
        const allSelected = allVisibleEntriesSelected(root);
        selectAll.textContent = allSelected
            ? selectAll.dataset.deselectLabel
            : selectAll.dataset.selectLabel;
        selectAll.dataset.selectionAction = allSelected ? "deselect" : "select";
    }
}

export function setSelectionMode(root, enabled) {
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
}

export function selectAllVisibleEntries(root) {
    const selections = visibleEntrySelections(root);
    selections.forEach((selection) => {
        selection.checked = true;
    });
}

export function deselectAllEntries(root) {
    setSelectionMode(root, false);
}

function visibleEntrySelections(root) {
    return Array.from(
        root.querySelectorAll("[data-library-select-entry]"),
    ).filter((selection) => {
        const panel = selection.closest("[data-library-panel]");
        const card = selection.closest(
            ".library-entry-card-shell, .library-admin-entry-row",
        );
        return panel?.hidden !== true && card?.hidden !== true;
    });
}

export function allVisibleEntriesSelected(root) {
    const selections = visibleEntrySelections(root);
    return selections.length > 0 && selections.every(({ checked }) => checked);
}

export async function confirmEntryDeletion(
    root,
    libraryEntries,
    schemas,
    i18n,
) {
    const entryIds = selectedEntryIds(root);
    if (entryIds.length === 0) return null;
    let plan;
    try {
        plan = await planLibraryEntryDeletion(entryIds);
    } catch (error) {
        showToast(i18n.t(deletionErrorKey(error)), { variant: "error" });
        return null;
    }
    const plannedIds = plan.entryIds;
    const selectedIds = new Set(entryIds);
    const cascadeEntries = plan.entries.filter(
        (entry) => !selectedIds.has(entry.id),
    );
    const cascadeWarning = cascadeEntries.length
        ? `<p>${escapeHtml(i18n.t("gateway.study.library_delete_warning"))}</p><ul class="library-delete-cascade-list">${cascadeEntries.map((entry) => `<li>${escapeHtml(entry.label)}</li>`).join("")}</ul>`
        : "";
    let blacklistContentHashes = false;
    const action = await openPopup({
        title: i18n.t("gateway.study.library_delete_title"),
        body: `${cascadeWarning}<label class="library-delete-permanent"><input class="choice-checkbox" type="checkbox" data-library-blacklist-content> ${escapeHtml(i18n.t("gateway.study.library_delete_permanent"))}</label>`,
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
    return action === "delete"
        ? { entryIds: plannedIds, blacklistContentHashes }
        : null;
}

export function deletionErrorKey(error) {
    return [
        "relationship_delete_restricted",
        "forbidden",
        "immutable_layer",
        "protected_content",
        "request_pending",
    ].includes(error.message)
        ? "gateway.study.library_delete_dependency_blocked"
        : "gateway.study.library_delete_error";
}
