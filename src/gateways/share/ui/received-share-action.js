/** Handles received user-share notifications inside the authenticated shell. */

import {
    rememberResolvedAccountShare,
    resolveReceivedShare,
} from "./received-share.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createI18n } from "/static/reuse/i18n.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";

function tokenFromActionUrl(actionUrl) {
    const url = new URL(actionUrl, window.location.origin);
    const match = url.pathname.match(/^\/share\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : "";
}

window.addEventListener("cognis:notification-action", (event) => {
    if (event.defaultPrevented) return;
    const actionUrl = event.detail?.actionUrl;
    const token = tokenFromActionUrl(actionUrl);
    if (!token) return;
    event.preventDefault();
    void navigateAccountShare(actionUrl);
});

export async function navigateAccountShare(actionUrl) {
    const token = tokenFromActionUrl(actionUrl);
    if (!token) return false;
    let shareVerified = false;
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
        shareVerified = true;
        if (payload.data.resourceType === "calendar") {
            const calendarI18n = await createI18n({
                componentStringBaseUrls: [
                    "/static/gateways/calendar/ui/languages",
                ],
            });
            const acknowledged = await openPopup({
                title: calendarI18n.t(
                    "gateway.calendar.share_acknowledge_title",
                ),
                body: `<p>${escapeHtml(calendarI18n.t("gateway.calendar.share_acknowledge_message"))}</p>`,
                actions: [
                    {
                        id: "continue",
                        label: calendarI18n.t(
                            "gateway.calendar.share_acknowledge_action",
                        ),
                        variant: "confirm",
                    },
                    {
                        id: "cancel",
                        label: calendarI18n.t("ui.reuse.cancel"),
                        variant: "neutral",
                    },
                ],
            });
            if (acknowledged !== "continue") return false;
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
        if (shareVerified) return false;
        const i18n = await createI18n({
            componentStringBaseUrls: ["/static/gateways/share/languages"],
        });
        showToast(i18n.t("share.error.invalid_token"), { variant: "error" });
        return false;
    }
}
