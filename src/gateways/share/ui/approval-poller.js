import { createI18n } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { openPopup } from "/static/reuse/popup.js";
import { isViewingAsGuest } from "./reuse/share-button.js";

/**
 * Share gateway navbar plugin: polls for pending share-link creation
 * approval requests targeting the current user and surfaces each as a
 * tick/cross popup ("User X has requested to create a share link"). Each
 * popup auto-resolves to "approve" after 60 seconds via `openPopup`'s
 * timeout support, mirroring the server-side auto-approve fallback.
 *
 * Because the Share gateway registers this script as a navbar plugin, it is
 * only ever loaded when the Share gateway is enabled — if the gateway is
 * disabled, `/api/v1/ui/navbar-plugins` never advertises this script and no
 * approval popups are ever shown.
 */

const POLL_INTERVAL_MS = 5_000;
const APPROVAL_TIMEOUT_MS = 60_000;

const shownApprovalIds = new Set();
let isPopupOpen = false;
let pollTimer = null;
let stopPollingForAuthFailure = false;

async function fetchPendingApprovals() {
    try {
        const response = await apiFetch("/api/v1/share/approvals/pending");
        if (response.status === 401) {
            return { approvals: [], unauthorized: true };
        }
        if (!response.ok) return { approvals: [], unauthorized: false };
        const payload = await response.json().catch(() => null);
        return {
            approvals: Array.isArray(payload?.data) ? payload.data : [],
            unauthorized: false,
        };
    } catch {
        return { approvals: [], unauthorized: false };
    }
}

async function respondToApproval(approvalId, decision) {
    try {
        await apiFetch(
            `/api/v1/share/approvals/${encodeURIComponent(approvalId)}/respond`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ decision }),
            },
        );
    } catch {
        // Best-effort: if the response fails to reach the server, the
        // 60-second server-side timeout will auto-approve on our behalf.
    }
}

async function showApprovalPopup(approval, i18n) {
    if (isPopupOpen) return;
    isPopupOpen = true;
    shownApprovalIds.add(approval.id);
    try {
        const message = i18n
            .t("share.approval.message")
            .replace("%requester%", approval.requesterDisplayName || "")
            .replace("%resource%", approval.resourceType || "");
        const result = await openPopup({
            title: i18n.t("share.approval.title"),
            body: message,
            actions: [
                {
                    id: "declined",
                    label: i18n.t("share.approval.decline"),
                    variant: "cancel",
                },
                {
                    id: "approved",
                    label: i18n.t("share.approval.approve"),
                    variant: "confirm",
                },
            ],
            timeoutMs: APPROVAL_TIMEOUT_MS,
            timeoutActionId: "approved",
        });
        const decision = result === "declined" ? "declined" : "approved";
        await respondToApproval(approval.id, decision);
    } finally {
        isPopupOpen = false;
    }
}

async function refreshApprovals(i18n) {
    const { approvals, unauthorized } = await fetchPendingApprovals();
    if (unauthorized) {
        stopPollingForAuthFailure = true;
        return;
    }
    const nextApproval = approvals.find(
        (approval) => !shownApprovalIds.has(approval.id),
    );
    if (!nextApproval || isPopupOpen) return;
    await showApprovalPopup(nextApproval, i18n);
}

async function startPolling(i18n) {
    await refreshApprovals(i18n);

    const runTick = async () => {
        if (stopPollingForAuthFailure) {
            pollTimer = null;
            return;
        }
        await refreshApprovals(i18n);
        pollTimer = setTimeout(runTick, POLL_INTERVAL_MS);
    };

    pollTimer = setTimeout(runTick, POLL_INTERVAL_MS);
}

(async function initApprovalPoller() {
    if (!localStorage.getItem("cognis_access_token")) return;
    if (isViewingAsGuest()) return;
    if (pollTimer) clearTimeout(pollTimer);
    stopPollingForAuthFailure = false;
    try {
        const i18n = await createI18n({
            componentStringBaseUrls: ["/static/gateways/share/languages"],
        });
        await startPolling(i18n);
    } catch {
        // Approval polling is best-effort; the page continues without it.
    }
})();
