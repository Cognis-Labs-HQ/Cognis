import { openPopup } from "../popup.js";
import { escapeHtml } from "../escape-html.js";

/** Resolve one localized discard decision and restore the edited control when kept. */
export async function confirmPopupDiscard(i18n, signal) {
    const previousFocus = document.activeElement;
    const decision = await openPopup({
        signal,
        title: i18n.t("ui.reuse.unsaved_changes"),
        body: `<p>${escapeHtml(i18n.t("ui.reuse.close_form_warning"))}</p>`,
        variant: "warning",
        actions: [
            {
                id: "discard",
                label: i18n.t("ui.reuse.discard"),
                variant: "confirm",
            },
            { id: "keep", label: i18n.t("ui.reuse.cancel"), variant: "cancel" },
        ],
    });
    if (decision !== "discard" && previousFocus?.isConnected)
        previousFocus.focus();
    return decision === "discard";
}
