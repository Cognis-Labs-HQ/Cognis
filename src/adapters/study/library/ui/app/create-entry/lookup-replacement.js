import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

export function hasLookupValues(form, strokeOnly = false) {
    return Array.from(
        form.querySelectorAll(
            strokeOnly
                ? "[data-library-provider-field]"
                : '[name^="field:"], [name^="relationship:"], [name="tags"]',
        ),
    ).some((control) => {
        if (control.libraryFieldValue) return true;
        if (control.type === "checkbox" || control.type === "radio")
            return control.checked;
        if (control.options)
            return Array.from(control.options).some(
                (option) => option.selected && option.value,
            );
        return Boolean(String(control.value ?? "").trim());
    });
}

export async function confirmLookupReplacement(i18n, strokeOnly = false) {
    return (
        (await openPopup({
            title: i18n.t("gateway.study.library_lookup_replace_title"),
            body: `<p>${escapeHtml(i18n.t(strokeOnly ? "gateway.study.library_lookup_replace_stroke_warning" : "gateway.study.library_lookup_replace_warning"))}</p>`,
            actions: [
                {
                    id: "replace",
                    label: i18n.t("gateway.study.library_lookup_replace"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "neutral",
                },
            ],
        })) === "replace"
    );
}

export function clearLookupValues(form, draft) {
    draft.fields = {};
    form.referenceGroups = {};
    form.compositionOrder = [];
    form.libraryGeneratedPronunciation = [];
    for (const control of form.querySelectorAll(
        '[name^="field:"], [name^="relationship:"]',
    )) {
        if (control.disabled) continue;
        if (control.options) {
            for (const option of control.options) option.selected = false;
        } else if (control.type === "checkbox" || control.type === "radio") {
            control.checked = false;
        } else {
            control.value = "";
            if (control.hasAttribute("data-library-provider-field"))
                control.libraryFieldValue = null;
        }
    }
    form.querySelector('[data-library-editor-panel="definitions"]')
        ?.querySelectorAll("[data-library-definition-id]")
        .forEach((article) => article.remove());
    form.querySelectorAll('[data-library-lookup-kind="strokePattern"]').forEach(
        (button) => {
            button.hidden = false;
        },
    );
    form.dispatchEvent(new Event("library-lookup-replace"));
}
