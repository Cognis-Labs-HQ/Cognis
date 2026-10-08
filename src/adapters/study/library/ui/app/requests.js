import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import {
    fetchLibraryPushRequests,
    reviewLibraryPromotion,
    withdrawLibraryPromotion,
} from "/static/gateways/study/ui/library-client.js";
import { renderCardContents } from "./cards.js";
import {
    layerForEntry,
    localizedLabel,
    renderDetailFields,
    renderMetadataPills,
    renderScope,
} from "./presentation.js";

export async function loadLibraryRequests(i18n) {
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
    if (filter === "review")
        return requests.filter(
            ({ canReview, status }) =>
                canReview === true && status === "pending",
        );
    return requests.filter(({ status }) => status === filter);
}

function requestCardPreview(entry, schemas, entries, i18n) {
    if (!entry)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_request_source_missing"))}</p>`;
    const schema = schemas.find(({ id }) => id === entry.schemaId);
    const layer = layerForEntry(schemas, entry);
    const fields = Object.fromEntries(
        (layer?.fields ?? [])
            .filter(
                (field) =>
                    !field.detail?.hidden &&
                    entry.fields?.[field.id] !== undefined,
            )
            .map((field) => [
                localizedLabel(field.metadata, entry.language) || field.id,
                field.type === "audio"
                    ? i18n.t("gateway.study.library_request_audio_attached")
                    : entry.fields[field.id],
            ]),
    );
    const references = [
        ...(entry.references ?? []),
        ...Object.values(entry.referenceGroups ?? {}).flat(2),
    ];
    const related = references
        .map(({ entryId }) => entries.find(({ id }) => id === entryId))
        .filter(Boolean);
    return `<div class="library-request-preview">
        ${layer ? renderCardContents(entry, layer, entries, schema, i18n) : `<strong>${escapeHtml(entry.label)}</strong>`}
        ${layer ? renderMetadataPills(entry, layer) : ""}
        ${entry.tags?.length ? `<div class="library-metadata-pills">${entry.tags.map((tag) => `<span class="library-metadata-pill">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <details><summary>${escapeHtml(i18n.t("gateway.study.library_request_details"))}</summary>
            ${renderDetailFields(fields)}
            ${related.length ? `<ul>${related.map((card) => `<li>${escapeHtml(card.label)}${card.fields?.translations ? ` — ${escapeHtml(Object.values(card.fields.translations).filter(Boolean).join(" · "))}` : ""}</li>`).join("")}</ul>` : ""}
        </details>
    </div>`;
}

export function renderLibraryRequests(
    requests,
    i18n,
    filter = "mine",
    { schemas = [], entries = [] } = {},
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
                      const kind = i18n.t(
                          `gateway.study.library_request_${request.kind ?? "promotion"}`,
                      );
                      const canAct = request.status === "pending";
                      const previewEntries = request.source
                          ? [
                                ...entries.filter(
                                    ({ id }) => id !== request.source.id,
                                ),
                                request.source,
                            ]
                          : entries;
                      const proposed = request.proposedEntry
                          ? {
                                ...request.source,
                                ...request.proposedEntry,
                                id: request.sourceEntryId,
                            }
                          : null;
                      return `<article class="library-request" data-library-request="${escapeHtml(request.id)}">
            <header class="library-request-header"><strong>${escapeHtml(kind)}</strong><span class="library-metadata-pill">${escapeHtml(status)}</span></header>
            <div class="library-request-destination">${renderScope(request.destination, i18n, destination)}<span>${escapeHtml(i18n.t("gateway.study.library_relocate_to"))} ${escapeHtml(destination)}${request.destination.scope === "class" ? ` · ${escapeHtml(request.destination.scopeId)}` : ""}</span></div>
            <div class="library-request-previews">${proposed ? `<section><h3>${escapeHtml(i18n.t("gateway.study.library_request_current"))}</h3>${requestCardPreview(request.source, schemas, previewEntries, i18n)}</section><section><h3>${escapeHtml(i18n.t("gateway.study.library_request_proposed"))}</h3>${requestCardPreview(proposed, schemas, previewEntries, i18n)}</section>` : requestCardPreview(request.source, schemas, previewEntries, i18n)}</div>
            <div class="library-request-meta"><span>${escapeHtml(i18n.t("gateway.study.library_request_by").replace("{{ account }}", request.requestedBy))}</span>${request.requestedAt ? `<time datetime="${escapeHtml(request.requestedAt)}">${escapeHtml(formatDateTime(request.requestedAt))}</time>` : ""}${request.reviewedBy ? `<span>${escapeHtml(i18n.t("gateway.study.library_request_reviewed_by").replace("{{ account }}", request.reviewedBy))}</span>` : ""}${request.reviewedAt ? `<time datetime="${escapeHtml(request.reviewedAt)}">${escapeHtml(formatDateTime(request.reviewedAt))}</time>` : ""}</div>
            <footer class="library-request-actions">${canAct && request.canReview ? `<button class="btn-confirm" type="button" data-library-review="approved">${escapeHtml(i18n.t("gateway.study.library_approve"))}</button><button class="btn-cancel" type="button" data-library-review="rejected">${escapeHtml(i18n.t("gateway.study.library_reject"))}</button>` : ""}${canAct && request.canWithdraw ? `<button class="btn-neutral" type="button" data-library-withdraw-request>${escapeHtml(i18n.t("gateway.study.library_withdraw"))}</button>` : ""}</footer>
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
            const refresh = event.target.closest(
                "[data-library-refresh-requests]",
            );
            if (refresh) {
                if (refresh.disabled) return;
                refresh.disabled = true;
                try {
                    await reload();
                } catch {
                    showToast(
                        i18n.t("gateway.study.library_requests_load_error"),
                        { variant: "error" },
                    );
                } finally {
                    refresh.disabled = false;
                }
                return;
            }
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
