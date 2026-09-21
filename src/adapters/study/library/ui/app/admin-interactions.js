import { showToast } from "/static/reuse/toast.js";
import { updateLibraryEntry } from "/static/gateways/study/ui/library-client.js";

export function bindAdminLibraryInteractions(root, { entries, i18n, signal }) {
    root.addEventListener(
        "submit",
        async (event) => {
            const form = event.target.closest("form[data-library-admin-entry]");
            if (!form) return;
            event.preventDefault();
            const entry = entries.find(
                ({ id }) => id === form.dataset.libraryAdminEntry,
            );
            if (!entry) return;
            const submit = form.querySelector('button[type="submit"]');
            submit.disabled = true;
            try {
                const updated = await updateLibraryEntry(entry.id, {
                    schemaId: entry.schemaId,
                    schemaVersion: entry.schemaVersion,
                    layer: entry.layer,
                    label: form.elements.label.value,
                    hidden: form.elements.hidden.checked,
                    fields: JSON.parse(form.elements.fields.value || "{}"),
                    references: JSON.parse(
                        form.elements.references.value || "[]",
                    ),
                });
                Object.assign(entry, updated);
                showToast(i18n.t("gateway.study.library_update_success"), {
                    variant: "success",
                });
            } catch {
                showToast(i18n.t("gateway.study.library_update_error"), {
                    variant: "error",
                });
            } finally {
                submit.disabled = false;
            }
        },
        { signal },
    );
}
