import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";

export async function confirmModuleUninstall(i18n) {
    let deleteContent = false;
    const confirmation = await openPopup({
        title: i18n.t("ui.app.modules.uninstall_title"),
        body: `<p>${escapeHtml(i18n.t("ui.app.modules.uninstall_warning"))}</p><label><input type="checkbox" data-delete-module-content> ${escapeHtml(i18n.t("ui.app.modules.uninstall_delete_content"))}</label>`,
        variant: "warning",
        actions: [
            {
                id: "uninstall",
                label: i18n.t("ui.reuse.uninstall"),
                variant: "cancel",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onAction(selectedAction, overlay) {
            if (selectedAction !== "uninstall") return;
            deleteContent = overlay.querySelector(
                "[data-delete-module-content]",
            ).checked;
        },
    });
    return confirmation === "uninstall" ? { deleteContent } : null;
}
