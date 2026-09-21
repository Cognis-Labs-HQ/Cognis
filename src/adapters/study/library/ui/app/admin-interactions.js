import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { updateLibraryEntry } from "/static/gateways/study/ui/library-client.js";

function editorBody(entry, i18n) {
    return `<form class="library-admin-editor" data-library-admin-editor>
        <label><span>${escapeHtml(i18n.t("gateway.study.library_admin_label"))}</span><input name="label" value="${escapeHtml(entry.label)}" required maxlength="500"></label>
        <label><span>${escapeHtml(i18n.t("gateway.study.library_admin_fields"))}</span><textarea name="fields" rows="7">${escapeHtml(JSON.stringify(entry.fields ?? {}, null, 2))}</textarea></label>
        <label><span>${escapeHtml(i18n.t("gateway.study.library_admin_references"))}</span><textarea name="references" rows="7">${escapeHtml(JSON.stringify(entry.references ?? [], null, 2))}</textarea></label>
        <label class="library-admin-hidden"><input name="hidden" type="checkbox"${entry.hidden ? " checked" : ""}> <span>${escapeHtml(i18n.t("gateway.study.library_admin_hidden"))}</span></label>
    </form>`;
}

export function bindAdminLibraryInteractions(
    root,
    { entries, i18n, render, signal },
) {
    let editorOpen = false;
    root.addEventListener(
        "click",
        async (event) => {
            const button = event.target.closest("[data-library-admin-edit]");
            if (!button || editorOpen) return;
            const entry = entries.find(
                ({ id }) => id === button.dataset.libraryAdminEdit,
            );
            if (!entry) return;
            editorOpen = true;
            await openPopup({
                title: i18n
                    .t("gateway.study.library_admin_edit_title")
                    .replace("{{ entry }}", entry.label),
                body: editorBody(entry, i18n),
                maxWidth: "min(46rem, 94vw)",
                actions: [
                    {
                        id: "save",
                        label: i18n.t("ui.reuse.save"),
                        variant: "confirm",
                    },
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "neutral",
                    },
                ],
                onAction: async (action, overlay) => {
                    if (action !== "save") return true;
                    const form = overlay.querySelector(
                        "[data-library-admin-editor]",
                    );
                    try {
                        const updated = await updateLibraryEntry(entry.id, {
                            schemaId: entry.schemaId,
                            schemaVersion: entry.schemaVersion,
                            layer: entry.layer,
                            label: form.elements.label.value,
                            hidden: form.elements.hidden.checked,
                            fields: JSON.parse(
                                form.elements.fields.value || "{}",
                            ),
                            references: JSON.parse(
                                form.elements.references.value || "[]",
                            ),
                        });
                        Object.assign(entry, updated);
                        render();
                        showToast(
                            i18n.t("gateway.study.library_update_success"),
                            { variant: "success" },
                        );
                        return true;
                    } catch {
                        showToast(
                            i18n.t("gateway.study.library_update_error"),
                            { variant: "error" },
                        );
                        return false;
                    }
                },
            }).finally(() => {
                editorOpen = false;
            });
        },
        { signal },
    );
}
