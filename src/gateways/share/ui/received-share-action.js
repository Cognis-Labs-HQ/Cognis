/** Routes received user-share actions through the single share-page flow. */

import { navigateTo } from "/static/reuse/app-router.js";

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

export async function navigateAccountShare(actionUrl) {
    const sharePath = sharePathFromActionUrl(actionUrl);
    return sharePath ? navigateTo(sharePath) : false;
}
