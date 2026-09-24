import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    fetchLibraryPushRequests,
    reviewLibraryPromotion,
    withdrawLibraryPromotion,
} from "/static/gateways/study/ui/library-client.js";

export async function loadLibraryRequests() {
    return fetchLibraryPushRequests().catch(() => []);
}

export function filterLibraryRequests(requests, filter, accountId) {
    if (filter === "mine")
        return requests.filter(({ requestedBy }) => requestedBy === accountId);
    if (filter === "review")
        return requests.filter(({ canReview }) => canReview === true);
    return requests.filter(({ status }) => status === filter);
}

export function renderLibraryRequests(requests, i18n, filter = "mine") {
    const visible = filterLibraryRequests(
        requests,
        filter,
        localStorage.getItem("cognis_account") ?? "",
    );
    return `<section class="library-request-list" data-library-requests>${
        visible.length
            ? visible
                  .map(
                      (request) =>
                          `<article data-library-request="${escapeHtml(request.id)}"><span>${escapeHtml(request.source?.label ?? request.sourceEntryId)} → ${escapeHtml(request.destination.scope === "class" ? request.destination.scopeId : request.destination.scope)}</span>${request.canReview ? `<button class="btn-confirm" type="button" data-library-review="approved">${escapeHtml(i18n.t("gateway.study.library_approve"))}</button><button class="btn-cancel" type="button" data-library-review="rejected">${escapeHtml(i18n.t("gateway.study.library_reject"))}</button>` : ""}${request.canWithdraw ? `<button class="btn-cancel" type="button" data-library-withdraw-request>${escapeHtml(i18n.t("gateway.study.library_withdraw"))}</button>` : ""}</article>`,
                  )
                  .join("")
            : `<p>${escapeHtml(i18n.t("gateway.study.library_no_requests"))}</p>`
    }</section>`;
}

export function bindLibraryRequestReviews(root, requests, { i18n, signal }) {
    root.addEventListener(
        "click",
        async (event) => {
            const review = event.target.closest("[data-library-review]");
            const withdraw = event.target.closest(
                "[data-library-withdraw-request]",
            );
            if (!review && !withdraw) return;
            const item = event.target.closest("[data-library-request]");
            const requestId = item?.dataset.libraryRequest;
            if (!requestId) return;
            if (withdraw) await withdrawLibraryPromotion(requestId);
            else
                await reviewLibraryPromotion(
                    requestId,
                    review.dataset.libraryReview,
                );
            const index = requests.findIndex(({ id }) => id === requestId);
            if (index >= 0) requests.splice(index, 1);
            item.remove();
            if (!requests.some((request) => request.canReview === true)) {
                root.querySelector(
                    'a[href="/study/library/requests"]',
                )?.classList.remove("study-subnav-attention");
            }
            if (!requests.length) {
                root.querySelector("[data-library-requests]").innerHTML =
                    `<p>${escapeHtml(i18n.t("gateway.study.library_no_requests"))}</p>`;
            }
        },
        { signal },
    );
}
