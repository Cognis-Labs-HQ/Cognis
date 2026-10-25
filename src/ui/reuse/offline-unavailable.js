import { createI18n } from "./i18n.js";
import { renderInPageCallout } from "./in-page-callout.js";
import { mountOfflineStatus } from "./offline-status.js";
import { isOffline } from "./offline-state.js";

/** Replace an unavailable page after its lifecycle has been stopped. Keep the shell usable. */
export async function showOfflineUnavailable(root, isCurrent = () => true) {
    const content = root?.querySelector(".main-window") ?? root;
    if (!content) return;
    const i18n = await createI18n();
    if (
        !isCurrent() ||
        !isOffline() ||
        (root.querySelector(".main-window") ?? root) !== content
    )
        return;
    mountOfflineStatus(root, { i18n });
    content.innerHTML = renderInPageCallout({
        variant: "info",
        title: i18n.t("ui.reuse.offline_mode_active"),
        body: i18n.t("ui.reuse.offline_page_unavailable"),
    });
    content.dataset.offlineUnavailable = "true";
}
