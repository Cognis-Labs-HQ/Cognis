import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";

export function canDeleteEntry(entry) {
    return entry.protected !== true && entry.canDelete === true;
}

export function librarySelectionFloatingMenu(entries, i18n) {
    if (entries.length === 0) return [];
    return [
        {
            id: "library-selection-actions",
            label: i18n.t("ui.reuse.actions"),
            render: () =>
                `<button class="btn-neutral library-selection-action" type="button" data-library-select-all>${escapeHtml(i18n.t("gateway.study.library_select_all"))}</button><span class="library-publish-menu" data-library-publish-menu hidden><button class="btn-confirm library-selection-action" type="button" data-library-publish-trigger>${escapeHtml(i18n.t("gateway.study.library_publish_to"))}</button><span class="library-publish-options"><button class="btn-confirm" type="button" data-library-publish="class">${escapeHtml(i18n.t("gateway.study.library_publish_class"))}</button><button class="btn-confirm" type="button" data-library-publish="global">${escapeHtml(i18n.t("gateway.study.library_publish_global"))}</button></span></span><button class="btn-cancel library-selection-action" type="button" data-library-withdraw-selection hidden>${escapeHtml(i18n.t("gateway.study.library_withdraw"))}</button><button class="btn-neutral library-selection-action" type="button" data-library-send-back-selection hidden>${escapeHtml(i18n.t("gateway.study.library_send_back"))}</button><button class="btn-cancel library-selection-action" type="button" data-library-delete-selection hidden>${escapeHtml(i18n.t("gateway.study.library_delete_selected"))}</button>`,
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
    const publishMenu = root.querySelector("[data-library-publish-menu]");
    const canPublish =
        entry?.scope === "user" && canDeleteEntry(entry) && !pending;
    if (publishMenu) publishMenu.hidden = !canPublish;
    const classOption = root.querySelector('[data-library-publish="class"]');
    if (classOption)
        classOption.hidden = !(locations?.readable ?? []).some(
            ({ scope }) => scope === "class",
        );
    const withdraw = root.querySelector("[data-library-withdraw-selection]");
    if (withdraw) {
        withdraw.hidden = !pending;
        withdraw.dataset.libraryRequestId = pending?.id ?? "";
    }
    const sendBack = root.querySelector("[data-library-send-back-selection]");
    if (sendBack)
        sendBack.hidden = !(
            entry &&
            entry.scope !== "user" &&
            canDeleteEntry(entry) &&
            !entry.createdBy?.startsWith("content-pack:")
        );
    const deletion = root.querySelector("[data-library-delete-selection]");
    if (deletion)
        deletion.hidden =
            !selected.length ||
            Boolean(pending) ||
            selected.some((candidate) => !canDeleteEntry(candidate));
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
    root.querySelectorAll(
        "[data-library-panel]:not([hidden]) .library-entry-card-shell:not([hidden]) [data-library-select-entry]",
    ).forEach((selection) => {
        selection.checked = true;
    });
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
