import { isOffline } from "/static/reuse/offline-state.js";
import { renderRequestPreview } from "./request-preview.js";
import { openPopup } from "/static/reuse/popup.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import {
    fetchLibraryPushRequests,
    reviewLibraryPromotion,
    withdrawLibraryPromotion,
} from "/static/gateways/study/library-client.js";
import { renderScope } from "./presentation.js";

export async function loadLibraryRequests(i18n) {
    if (isOffline()) return [];
    try {
        return await fetchLibraryPushRequests();
    } catch {
        showToast(i18n.t("gateway.study.library_requests_load_error"), {
            variant: "error",
        });
        return [];
    }
}

export function filterLibraryRequests(requests, filter, accountId) {
    if (filter === "mine")
        return requests.filter(({ requestedBy }) => requestedBy === accountId);
    return requests.filter(({ status }) => status === filter);
}

export async function loadRequestProfiles(requests) {
    const client = uiCtx.capabilities.get("social:profileUiClient");
    if (!client) return new Map();
    const accounts = [
        ...new Set(
            requests
                .flatMap(({ requestedBy, reviewedBy, modifiedBy }) => [
                    requestedBy,
                    reviewedBy,
                    ...(modifiedBy ?? []),
                ])
                .filter(Boolean),
        ),
    ];
    return new Map(
        await Promise.all(
            accounts.map(async (account) => {
                try {
                    const response = await client.getProfile(account);
                    return [
                        account,
                        response.ok ? (await response.json()).data : null,
                    ];
                } catch (error) {
                    console.error("Request profile retrieval failed.", {
                        component: "study-library",
                        operation: "loadRequestProfiles",
                        errorName: error?.name || "Error",
                    });
                    return [account, null];
                }
            }),
        ),
    );
}

function requestPerson(account, role, timestamp, profiles, i18n) {
    if (!account) return "";
    const profile = profiles.get(account);
    const label = profile?.displayName || account;
    const title =
        i18n.t(role).replace("{{ account }}", label) +
        (timestamp ? ` · ${formatDateTime(timestamp)}` : "");
    const renderer = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    const roleLabel = escapeHtml(
        i18n.t(role).replace("{{ account }}", "").trim(),
    );
    if (!profile || !renderer)
        return `<span class="library-request-person"><span>${roleLabel}</span><a href="/profile/${encodeURIComponent(profile?.handle || account)}">${escapeHtml(label)}</a></span>`;
    const avatar = renderer.buildMarkup({
        avatarKey: profile.avatarKey,
        label,
        colorSeed: account,
        profileHandle: profile.handle || account,
        avatarClass: "library-request-avatar",
        imageClass: "library-request-avatar-image",
        fallbackClass: "library-request-avatar-initials",
    });
    return `<span class="library-request-person" title="${escapeHtml(title)}"><span>${roleLabel}</span>${avatar}<a href="/profile/${encodeURIComponent(profile.handle || account)}">${escapeHtml(label)}</a></span>`;
}

export function renderLibraryRequests(
    requests,
    i18n,
    filter = "mine",
    { schemas = [], entries = [], profiles = new Map() } = {},
) {
    const visible = filterLibraryRequests(
        requests,
        filter,
        localStorage.getItem("cognis_account") ?? "",
    ).sort((left, right) =>
        (right.requestedAt ?? "").localeCompare(left.requestedAt ?? ""),
    );
    return `<section class="library-request-list" data-library-requests>${
        visible.length
            ? visible
                  .map((request) => {
                      const destination = i18n.t(
                          `gateway.study.library_destination_${request.destination.scope}`,
                      );
                      const status = i18n.t(
                          `gateway.study.library_requests_${request.status}`,
                      );
                      const canAct =
                          filter === "pending" && request.status === "pending";
                      return `<article class="library-request" data-library-request="${escapeHtml(request.id)}">
            <header class="library-request-header"><div class="library-request-meta">${requestPerson(request.requestedBy, "adapter.study.library.request_submitted_by", request.requestedAt, profiles, i18n)}${requestPerson(request.reviewedBy, request.status === "approved" ? "adapter.study.library.request_approved_by" : "gateway.study.library_request_reviewed_by", null, profiles, i18n)}</div><span class="library-metadata-pill"${request.reviewedAt ? ` title="${escapeHtml(formatDateTime(request.reviewedAt))}" tabindex="0"` : ""}>${escapeHtml(status)}</span></header>
            <div class="library-request-destination">${renderScope(request.destination, i18n, destination)}<span>${escapeHtml(i18n.t("gateway.study.library_relocate_to"))} ${escapeHtml(destination)}${request.destination.scope === "class" ? ` · ${escapeHtml(request.destination.scopeId)}` : ""}</span></div>
            <div class="library-request-previews">${request.proposedEntry ? `<section><h3>${escapeHtml(i18n.t("gateway.study.library_request_current"))}</h3>${renderRequestPreview(request, schemas, entries, i18n, false)}</section><section><h3>${escapeHtml(i18n.t("gateway.study.library_request_proposed"))}</h3>${renderRequestPreview(request, schemas, entries, i18n, true)}</section>` : renderRequestPreview(request, schemas, entries, i18n, true)}</div>

            <footer class="library-request-actions">${canAct && request.canReview ? `<button class="btn-confirm" type="button" data-library-review="approved">${escapeHtml(i18n.t("gateway.study.library_approve"))}</button><button class="btn-cancel" type="button" data-library-review="rejected">${escapeHtml(i18n.t("gateway.study.library_reject"))}</button>` : ""}${canAct && request.canWithdraw ? `<button class="btn-cancel" type="button" data-library-withdraw-request>${escapeHtml(i18n.t("gateway.study.library_withdraw"))}</button>` : ""}</footer>
        </article>`;
                  })
                  .join("")
            : `<p>${escapeHtml(i18n.t("gateway.study.library_requests_empty"))}</p>`
    }</section>`;
}

export function bindLibraryRequestReviews(
    root,
    requests,
    { i18n, signal, render, reload },
) {
    const busy = new Set();
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
            if (!requestId || busy.has(requestId)) return;
            busy.add(requestId);
            item.setAttribute("aria-busy", "true");
            item.querySelectorAll("button").forEach((button) => {
                button.disabled = true;
            });
            try {
                const request = requests.find(({ id }) => id === requestId);
                const action = withdraw
                    ? "withdraw"
                    : review.dataset.libraryReview;
                const confirmation = await openPopup({
                    title: i18n.t("ui.reuse.confirm"),
                    body:
                        request?.destination.scope === "user" &&
                        action === "approved"
                            ? i18n.t(
                                  "gateway.study.library_relocation_approval_warning",
                              )
                            : i18n
                                  .t(
                                      "adapter.study.library.request_confirm_action",
                                  )
                                  .replace(
                                      "{{ action }}",
                                      i18n.t(
                                          action === "approved"
                                              ? "gateway.study.library_approve"
                                              : action === "rejected"
                                                ? "gateway.study.library_reject"
                                                : "gateway.study.library_withdraw",
                                      ),
                                  ),
                    variant: "warning",
                    actions: [
                        {
                            id: "confirm",
                            label: i18n.t("ui.reuse.confirm"),
                            variant:
                                action === "approved" &&
                                request?.destination.scope !== "user"
                                    ? "confirm"
                                    : "cancel",
                        },
                        {
                            id: "cancel",
                            label: i18n.t("ui.reuse.cancel"),
                            variant: "neutral",
                        },
                    ],
                });
                if (confirmation !== "confirm") return;
                const updated = withdraw
                    ? await withdrawLibraryPromotion(requestId)
                    : await reviewLibraryPromotion(
                          requestId,
                          review.dataset.libraryReview,
                      );
                const index = requests.findIndex(({ id }) => id === requestId);
                if (index >= 0)
                    requests[index] = {
                        ...requests[index],
                        ...updated,
                        canReview: false,
                        canWithdraw: false,
                    };
                render();
                showToast(i18n.t("gateway.study.library_request_completed"), {
                    variant: "success",
                });
            } catch (error) {
                showToast(
                    i18n.t(
                        error.message === "already_reviewed" ||
                            [
                                "request_source_moved",
                                "request_source_changed",
                            ].includes(error.message)
                            ? "gateway.study.library_request_stale"
                            : error.message ===
                                    "reference_visibility_too_low" ||
                                error.message === "reference_not_found"
                              ? "gateway.study.library_dependency_scope_help"
                              : "gateway.study.library_request_action_error",
                    ),
                    { variant: "error" },
                );
                if (
                    error.message === "already_reviewed" ||
                    ["request_source_moved", "request_source_changed"].includes(
                        error.message,
                    )
                ) {
                    try {
                        await reload();
                    } catch {
                        showToast(
                            i18n.t("gateway.study.library_requests_load_error"),
                            { variant: "error" },
                        );
                    }
                }
            } finally {
                busy.delete(requestId);
                item.removeAttribute("aria-busy");
                item.querySelectorAll("button").forEach((button) => {
                    button.disabled = false;
                });
            }
        },
        { signal },
    );
}
