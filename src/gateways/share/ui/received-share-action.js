/** Routes received user-share actions through the single share-page flow. */

import { navigateTo } from "/static/reuse/app-router.js";
import { resolveAccountShare } from "./received-share.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { createI18n } from "/static/reuse/i18n.js";
import { showToast } from "/static/reuse/toast.js";

let accountShareMonitor = null;

function monitorAccountShare(shareId) {
    if (accountShareMonitor) clearTimeout(accountShareMonitor);
    const poll = async () => {
        const response = await apiFetch(
            `/api/v1/share/status/${encodeURIComponent(shareId)}`,
            { suppressAccessDeniedEvent: true },
        ).catch(() => null);
        if (response && !response.ok) {
            const i18n = await createI18n({
                componentStringBaseUrls: ["/static/gateways/share/languages"],
            });
            showToast(i18n.t("share.error.access_denied"), {
                variant: "error",
            });
            await navigateTo("/shares");
            return;
        }
        accountShareMonitor = setTimeout(poll, 500);
    };
    accountShareMonitor = setTimeout(poll, 500);
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
