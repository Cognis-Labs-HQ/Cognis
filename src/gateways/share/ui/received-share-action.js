/** Routes received user-share actions through the single share-page flow. */

import { navigateTo } from "/static/reuse/app-router.js";
import { resolveAccountShare } from "./received-share.js";
import { createI18n } from "/static/reuse/i18n.js";
import { showToast } from "/static/reuse/toast.js";
import { stopShareStatusWatch, watchShareStatus } from "./status-monitor.js";

function monitorAccountShare(shareId) {
    const stopOnNavigation = () => stopShareStatusWatch();
    window.addEventListener("cognis:route-will-change", stopOnNavigation, {
        once: true,
    });
    watchShareStatus(shareId, async () => {
        window.removeEventListener(
            "cognis:route-will-change",
            stopOnNavigation,
        );
        const i18n = await createI18n({
            componentStringBaseUrls: ["/static/gateways/share/languages"],
        });
        showToast(i18n.t("share.error.access_denied"), {
            variant: "error",
        });
        await navigateTo("/share");
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
    const currentAccountId = String(
        localStorage.getItem("cognis_account") ?? "",
    ).trim();
    const ownedByCurrentAccount =
        currentAccountId && share?.ownerAccountId === currentAccountId;
    const result = await resolveAccountShare(share?.id, {
        passwordProtected:
            share?.passwordProtected === true && !ownedByCurrentAccount,
    });
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
