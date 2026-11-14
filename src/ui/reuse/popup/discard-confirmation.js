/**
 * Requests one localized decision before discarding an unsaved popup draft.
 * Public export: confirmPopupDiscard resolves whether the draft may be discarded.
 * @example if (await confirmPopupDiscard(i18n, signal)) closeEditor();
 */
import { openPopup } from "../popup.js";
import { escapeHtml } from "../escape-html.js";

/** @param {object} i18n @param {AbortSignal} signal @returns {Promise<boolean>} */
export async function confirmPopupDiscard(i18n, signal) {
    const decision = await openPopup({
        signal,
        title: i18n.t("ui.reuse.unsaved_changes"),
        body: `<p>${escapeHtml(i18n.t("ui.reuse.close_form_warning"))}</p>`,
        variant: "warning",
        onOpen: (overlay) => {
            overlay.querySelector('[data-popup-action="keep"]').focus();
        },
        actions: [
            {
                id: "discard",
                label: i18n.t("ui.reuse.discard"),
                variant: "cancel",
            },
            {
                id: "keep",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
    });
    return decision === "discard";
}
