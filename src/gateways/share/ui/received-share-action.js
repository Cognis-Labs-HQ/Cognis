/** Handles received user-share notifications inside the authenticated shell. */

import {
    rememberResolvedAccountShare,
    resolveReceivedShare,
} from "./received-share.js";
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
    void navigateAccountShare(actionUrl);
});

export async function navigateAccountShare(actionUrl) {
    const token = tokenFromActionUrl(actionUrl);
    if (!token) return false;
    try {
        const accessToken = localStorage.getItem("cognis_access_token");
        const response = await resolveReceivedShare(token, {
            headers: accessToken
                ? { authorization: `Bearer ${accessToken}` }
                : undefined,
            useAccountKeyring: Boolean(accessToken),
        });
        if (!response) return false;
        if (response.status === 404) {
            const i18n = await createI18n({
                componentStringBaseUrls: ["/static/gateways/share/languages"],
            });
            showToast(i18n.t("share.error.not_found"), { variant: "warning" });
            return false;
        }
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.data?.directAccess) {
            throw new Error("share_resolution_failed");
        }
        rememberResolvedAccountShare(token, payload.data);
        const navigationUrl = String(
            payload.data.navigationUrl || payload.data.contentUrl || "",
        ).trim();
        if (!navigationUrl) throw new Error("share_delivery_unavailable");
        const feedback = payload.data.feedback;
        const messageKey = String(feedback?.messageKey ?? "").trim();
        if (messageKey) {
            const feedbackI18n = await createI18n({
                componentStringBaseUrls: feedback.stringsBaseUrl,
            });
            showToast(feedbackI18n.t(messageKey), { variant: "success" });
        }
        await navigateTo(navigationUrl);
        return true;
    } catch {
        const i18n = await createI18n({
            componentStringBaseUrls: ["/static/gateways/share/languages"],
        });
        showToast(i18n.t("share.error.invalid_token"), { variant: "error" });
        return false;
    }
}
