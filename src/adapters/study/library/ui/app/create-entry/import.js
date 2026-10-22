import { createFormBuilder } from "/static/reuse/form-builder.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    importLibraryEntries,
    fetchLibraryLocations,
} from "/static/gateways/study/library-client.js";
import { navigateTo } from "/static/reuse/app-router.js";

export async function openLibraryImport(i18n) {
    const { writable } = await fetchLibraryLocations();
    const locations = [...writable].sort(
        (left, right) =>
            Number(right.scope === "global") - Number(left.scope === "global"),
    );
    let form;
    await openPopup({
        title: i18n.t("gateway.study.library_import"),
        body: createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "library-import-form",
                includeSubmitButton: false,
                fields: [
                    {
                        name: "file",
                        type: "file",
                        required: true,
                        labelKey: "ui.reuse.file",
                        attributes: { accept: "application/json,.json" },
                    },
                    {
                        name: "location",
                        type: "select",
                        required: true,
                        labelKey: "gateway.study.library_scope",
                        options: locations.map((location, index) => ({
                            value: String(index),
                            label: i18n
                                .t(
                                    `gateway.study.library_scope_${location.scope}`,
                                )
                                .replace(
                                    "{{ class name }}",
                                    location.scopeId ?? "",
                                ),
                        })),
                    },
                ],
            },
        ).render(),
        actions: [
            {
                id: "import",
                label: i18n.t("ui.reuse.import"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen: (overlay) => {
            form = overlay.querySelector("#library-import-form");
        },
        onAction: async (action) => {
            if (action !== "import") return true;
            if (!form.reportValidity()) return false;
            try {
                const document = JSON.parse(
                    await form.elements.file.files[0].text(),
                );
                const result = await importLibraryEntries(
                    locations[Number(form.elements.location.value)],
                    document,
                );
                showToast(
                    i18n
                        .t("gateway.study.library_import_success")
                        .replace("{{ count }}", String(result.entries.length)),
                    { variant: "success" },
                );
                await navigateTo(window.location.pathname);
                return true;
            } catch (error) {
                showToast(
                    i18n
                        .t("gateway.study.library_import_error")
                        .replace("{{ reason }}", error.message),
                    { variant: "error" },
                );
                return false;
            }
        },
    });
}
