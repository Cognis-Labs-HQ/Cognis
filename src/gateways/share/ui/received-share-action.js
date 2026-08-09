/** Handles received user-share notifications inside the authenticated shell. */

import { resolveReceivedShare } from "./received-share.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { createI18n } from "/static/reuse/i18n.js";
import { showToast } from "/static/reuse/toast.js";

function tokenFromActionUrl(actionUrl) {
    const url = new URL(actionUrl, window.location.origin);
    const match = url.pathname.match(/^\/share\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : "";
}

window.addEventListener("cognis:notification-action", (event) => {
    const actionUrl = event.detail?.actionUrl;
    const token = tokenFromActionUrl(actionUrl);
    if (!token) return;
    event.preventDefault();
    void (async () => {
        try {
            const accessToken = localStorage.getItem("cognis_access_token");
            const response = await resolveReceivedShare(token, {
                headers: accessToken
                    ? { authorization: `Bearer ${accessToken}` }
                    : undefined,
                useAccountKeyring: false,
            });
            if (!response) return;
            if (response.status === 404) {
                const i18n = await createI18n({
                    componentStringBaseUrls: [
                        "/static/gateways/share/languages",
                    ],
                });
                showToast(i18n.t("share.error.not_found"), {
                    variant: "warning",
                });
                return;
            }
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.data) {
                throw new Error("share_resolution_failed");
            }
            const sharePath = new URL(actionUrl, window.location.origin)
                .pathname;
            const navigationUrl = String(
                payload.data.guestAccessToken
                    ? sharePath
                    : payload.data.navigationUrl || sharePath,
            ).trim();
            if (!navigationUrl) {
                throw new Error("share_delivery_unavailable");
            }
            const feedback = payload.data.feedback;
            const messageKey = String(feedback?.messageKey ?? "").trim();
            if (messageKey) {
                const feedbackI18n = await createI18n({
                    componentStringBaseUrls: feedback.stringsBaseUrl,
                });
                showToast(feedbackI18n.t(messageKey), {
                    variant: "success",
                });
            }
            await navigateTo(navigationUrl);
        } catch {
            const i18n = await createI18n({
                componentStringBaseUrls: ["/static/gateways/share/languages"],
            });
            showToast(i18n.t("share.error.invalid_token"), {
                variant: "error",
            });
        }
    })();
});
