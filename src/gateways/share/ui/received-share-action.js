/** Routes received user-share actions through the single share-page flow. */

import { navigateTo } from "/static/reuse/app-router.js";
import { resolveAccountShare } from "./received-share.js";
import { createI18n } from "/static/reuse/i18n.js";
import { showToast } from "/static/reuse/toast.js";
import { watchShareStatus } from "./status-monitor.js";

function monitorAccountShare(shareId) {
    watchShareStatus(shareId, async () => {
        const i18n = await createI18n({
            componentStringBaseUrls: ["/static/gateways/share/languages"],
        });
        showToast(i18n.t("share.error.access_denied"), {
            variant: "error",
        });
        await navigateTo("/shares");
    });
}

function sharePathFromActionUrl(actionUrl) {
    const url = new URL(actionUrl, window.location.origin);
    return url.origin === window.location.origin &&
        /^\/share\/[^/]+$/.test(url.pathname)
        ? `${url.pathname}${url.search}${url.hash}`
        : "";
}

window.addEventListener("cognis:notification-action", (event) => {
    if (event.defaultPrevented) return;
    const sharePath = sharePathFromActionUrl(event.detail?.actionUrl);
    if (!sharePath) return;
    event.preventDefault();
    void navigateTo(sharePath);
});

export async function navigateAccountShare(share) {
    const result = await resolveAccountShare(share?.id);
    const destinationUrl = String(result?.data?.destinationUrl ?? "").trim();
    if (!destinationUrl) {
        if (result instanceof Response) {
            const i18n = await createI18n({
                componentStringBaseUrls: ["/static/gateways/share/languages"],
            });
            showToast(i18n.t("share.error.access_denied"), {
                variant: "error",
            });
        }
        return false;
    }
    const destination = new URL(destinationUrl, window.location.origin);
    const navigationPath = `${destination.pathname}${destination.search}${destination.hash}`;
    const navigated = await navigateTo(navigationPath);
    if (navigated) monitorAccountShare(String(share.id));
    return navigated;
}
