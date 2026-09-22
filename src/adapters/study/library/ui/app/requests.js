import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    fetchLibraryPushRequests,
    reviewLibraryPromotion,
} from "/static/gateways/study/ui/library-client.js";

export async function loadLibraryRequests() {
    return fetchLibraryPushRequests().catch(() => []);
}

export function renderLibraryRequests(requests, i18n) {
    return `<section class="library-request-list" data-library-requests>${
        requests.length
            ? requests
                  .map(
                      (request) =>
                          `<article data-library-request="${escapeHtml(request.id)}"><span>${escapeHtml(request.source?.label ?? request.sourceEntryId)} → ${escapeHtml(request.destination.scope === "class" ? request.destination.scopeId : request.destination.scope)}</span><button class="btn-confirm" type="button" data-library-review="approved">${escapeHtml(i18n.t("gateway.study.library_approve"))}</button><button class="btn-cancel" type="button" data-library-review="rejected">${escapeHtml(i18n.t("gateway.study.library_reject"))}</button></article>`,
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
            if (!review) return;
            const item = review.closest("[data-library-request]");
            const requestId = item?.dataset.libraryRequest;
            if (!requestId) return;
            await reviewLibraryPromotion(
                requestId,
                review.dataset.libraryReview,
            );
            const index = requests.findIndex(({ id }) => id === requestId);
            if (index >= 0) requests.splice(index, 1);
            item.remove();
            if (!requests.length) {
                root.querySelector("[data-library-requests]").innerHTML =
                    `<p>${escapeHtml(i18n.t("gateway.study.library_no_requests"))}</p>`;
            }
        },
        { signal },
    );
}
