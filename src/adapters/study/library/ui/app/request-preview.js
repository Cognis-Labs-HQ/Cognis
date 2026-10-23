import { showToast } from "/static/reuse/toast.js";
import { renderEntryCard } from "./cards.js";
import { layerForEntry } from "./presentation.js";
import { openEntryPopup } from "./entry-popup.js";
import { stageLibraryPromotion } from "/static/gateways/study/library-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

export function requestPreviewContext(request, entries, staged = true) {
    const entry =
        staged && request.proposedEntry
            ? {
                  ...request.source,
                  ...request.proposedEntry,
                  id: request.sourceEntryId,
                  previewRequestId: request.id,
              }
            : staged && request.source
              ? { ...request.source, previewRequestId: request.id }
              : request.source;
    const context = [
        ...new Map(
            [
                ...entries,
                ...(request.sourceContext ?? []),
                ...(staged
                    ? (request.proposedEntry?.linkedEntries ?? [])
                    : []
                ).map(({ key, entry }) => ({ ...entry, id: key })),
                ...(entry ? [entry] : []),
            ].map((item) => [item.id, item]),
        ).values(),
    ];
    return { entry, entries: context };
}

export function renderRequestPreview(
    request,
    schemas,
    entries,
    i18n,
    staged = true,
) {
    const context = requestPreviewContext(request, entries, staged);
    if (!context.entry)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_request_source_missing"))}</p>`;
    const layer = layerForEntry(schemas, context.entry);
    const schema = schemas.find(({ id }) => id === context.entry.schemaId);
    if (!layer || !schema)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_request_source_missing"))}</p>`;
    return `<div data-request-preview="${staged ? "staged" : "current"}">${renderEntryCard(context.entry, layer, context.entries, schema, new Map(), i18n)}</div>`;
}

export function bindRequestPreviews(
    root,
    requests,
    { schemas, entries, i18n, signal, reload },
) {
    root.addEventListener(
        "click",
        async (event) => {
            const card = event.target.closest("[data-library-entry]");
            const preview = card?.closest("[data-request-preview]");
            if (!preview) return;
            const request = requests.find(
                ({ id }) =>
                    id ===
                    preview.closest("[data-library-request]")?.dataset
                        .libraryRequest,
            );
            if (!request) return;
            const staged = preview.dataset.requestPreview === "staged";
            const context = requestPreviewContext(request, entries, staged);
            const entry = context.entries.find(
                ({ id }) => id === card.dataset.libraryEntry,
            );
            if (!entry) return;
            const references = [
                ...(entry.references ?? []),
                ...Object.values(entry.referenceGroups ?? {}).flat(2),
            ]
                .map(({ entryId }) =>
                    context.entries.find(({ id }) => id === entryId),
                )
                .filter(Boolean);
            try {
                await openEntryPopup(
                    root,
                    entry,
                    schemas,
                    context.entries,
                    i18n,
                    entry.language,
                    signal,
                    {
                        detail: { entry, references, usedBy: [] },
                        readOnly:
                            !staged ||
                            !request.canStage ||
                            request.status !== "pending" ||
                            entry.id !== request.sourceEntryId,
                        editDraft:
                            staged &&
                            request.canStage &&
                            request.status === "pending" &&
                            entry.id === request.sourceEntryId,
                        requestId: staged ? request.id : undefined,
                        persistDraft: async (proposed) => {
                            const updated = await stageLibraryPromotion(
                                request.id,
                                proposed,
                            );
                            Object.assign(request, updated);
                            await reload();
                            return { ...entry, ...proposed };
                        },
                    },
                );
            } catch (error) {
                console.error("Study request preview failed.", {
                    component: "study-library",
                    operation: "requestPreview",
                    requestId: request.id,
                    errorName: error?.name ?? "Error",
                });
                if (!signal?.aborted)
                    showToast(
                        i18n.t("gateway.study.library_request_action_error"),
                        {
                            variant: "error",
                        },
                    );
            }
        },
        { signal },
    );
}
