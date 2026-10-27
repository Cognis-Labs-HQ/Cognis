import { registerEnrolledLibrarySnapshots } from "./reuse/library-offline-snapshot.js";
import { readStudySnapshot } from "./offline-content.js";
import { deliverOrQueue } from "/static/reuse/offline-delivery.js";
import { createOfflineReadCache } from "/static/reuse/offline-read-cache.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { apiFetch } from "/static/reuse/api-client.js";

async function executeFetchLibrarySchemas(request, languageCode) {
    const query = new URLSearchParams();
    if (languageCode) query.set("language", languageCode);
    const suffix = query.size > 0 ? `?${query}` : "";
    const response = await request(`/api/v1/study/library/schemas${suffix}`);
    if (!response.ok) throw new Error("schemas_failed");
    return (await response.json()).data;
}

async function executeFetchLibraryLocations(request, languageCode) {
    const query = new URLSearchParams();
    if (languageCode) query.set("language", languageCode);
    const suffix = query.size > 0 ? `?${query}` : "";
    const response = await request(`/api/v1/study/library/locations${suffix}`);
    if (!response.ok) throw new Error("locations_failed");
    return (await response.json()).data;
}

async function executeFetchLibraryForms(request) {
    const response = await request("/api/v1/study/library/forms");
    if (!response.ok) throw new Error("forms_failed");
    return (await response.json()).data;
}

async function executeFetchLibraryEntries(
    request,
    { scope, scopeId, schemaId, layer, entryIds, sourceRecordIds },
) {
    const query = new URLSearchParams({ scope });
    if (scopeId) query.set("scopeId", scopeId);
    if (schemaId) query.set("schemaId", schemaId);
    if (layer) query.set("layer", layer);
    for (const id of entryIds ?? []) query.append("entryId", id);
    for (const id of sourceRecordIds ?? []) query.append("sourceRecordId", id);
    const response = await request(`/api/v1/study/library/entries?${query}`);
    if (!response.ok) throw new Error("entries_failed");
    return (await response.json()).data;
}

async function executeFetchLibraryEntry(request, entryId) {
    const response = await request(
        `/api/v1/study/library/entries/${encodeURIComponent(entryId)}/trace`,
    );
    if (!response.ok) throw new Error("entry_failed");
    return (await response.json()).data;
}

async function executeFetchViewedLibraryEntryIds(request) {
    const response = await request("/api/v1/study/library/viewed-entries");
    if (!response.ok) throw new Error("viewed_entries_failed");
    return (await response.json()).data;
}

async function executeMarkLibraryEntriesViewed(request, entryIds) {
    const response = await request("/api/v1/study/library/viewed-entries", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryIds }),
    });
    if (!response.ok)
        throw Object.assign(new Error("mark_viewed_failed"), {
            status: response.status,
        });
}

async function executeFetchLibraryAudioUrl(
    request,
    entryId,
    fieldId,
    { signal, transformation, refresh = false } = {},
) {
    const response = await request(
        `/api/v1/study/library/entries/${encodeURIComponent(entryId)}/audio/${encodeURIComponent(fieldId)}`,
        {
            signal,
            ...(transformation || refresh
                ? {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                          transformation,
                          ...(refresh ? { refresh: true } : {}),
                      }),
                  }
                : {}),
        },
    );
    if (!response.ok) throw new Error("audio_failed");
    return URL.createObjectURL(await response.blob());
}

async function executeCreateLibraryEntry(request, location, entry) {
    const response = await request("/api/v1/study/library/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, entry }),
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload.error?.code ?? "create_failed");
        error.details = payload.error;
        throw error;
    }
    return (await response.json()).data;
}

async function executeFetchLibraryPushRequests(request, { status } = {}) {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    const response = await request(
        `/api/v1/study/library/push-requests${status ? `?${query}` : ""}`,
    );
    if (!response.ok) throw new Error("requests_failed");
    return (await response.json()).data;
}

async function executeFetchSearchableDictionaryProviders(request, language) {
    const response = await request(
        `/api/v1/study/library/dictionary/providers?${new URLSearchParams({ language })}`,
    );
    if (!response.ok) throw new Error("lookup_providers_failed");
    return (await response.json()).data;
}

async function executeSearchLibraryDictionary(request, input) {
    const response = await request("/api/v1/study/library/dictionary/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error?.code ?? "lookup_failed");
    }
    return (await response.json()).data;
}

async function executeRequestLibraryPromotion(request, entryId, destination) {
    const response = await request("/api/v1/study/library/push-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId, destination }),
    });
    if (!response.ok) throw new Error("request_failed");
    return (await response.json()).data;
}

async function executeRelocateLibraryEntry(request, entryId, destination) {
    const response = await request(
        `/api/v1/study/library/entries/${encodeURIComponent(entryId)}/relocate`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ destination }),
        },
    );
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error?.code ?? "move_failed");
    }
    return (await response.json()).data;
}

async function executeRequestLibraryUpdate(request, entryId, proposedEntry) {
    const response = await request("/api/v1/study/library/push-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            entryId,
            destination: { scope: "global", scopeId: "global" },
            proposedEntry,
        }),
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload.error?.code ?? "request_failed");
        error.details = payload.error;
        throw error;
    }
    return (await response.json()).data;
}

async function executeReviewLibraryPromotion(request, requestId, decision) {
    const response = await request(
        `/api/v1/study/library/push-requests/${encodeURIComponent(requestId)}`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ decision }),
        },
    );
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error?.code ?? "review_failed");
    }
    return (await response.json()).data;
}

async function executeWithdrawLibraryPromotion(request, requestId) {
    const response = await request(
        `/api/v1/study/library/push-requests/${encodeURIComponent(requestId)}`,
        { method: "DELETE" },
    );
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error?.code ?? "withdraw_failed");
    }
    return (await response.json()).data;
}

async function executeMoveLibraryEntryToPersonal(request, entryId) {
    const response = await request(
        `/api/v1/study/library/entries/${encodeURIComponent(entryId)}/move-to-personal`,
        { method: "POST" },
    );
    if (!response.ok) throw new Error("move_failed");
    return (await response.json()).data;
}

async function executeUpdateLibraryEntry(request, entryId, entry) {
    const response = await request(
        `/api/v1/study/library/entries/${encodeURIComponent(entryId)}`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entry }),
        },
    );
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload.error?.code ?? "update_failed");
        error.details = payload.error;
        throw error;
    }
    return (await response.json()).data;
}

async function executePlanLibraryEntryDeletion(request, entryIds) {
    const response = await request(
        "/api/v1/study/library/entries/deletion-plan",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entryIds }),
        },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.code || "delete_failed");
    return result.data;
}

async function executeDeleteLibraryEntries(
    request,
    entryIds,
    { blacklistContentHashes = false } = {},
) {
    const response = await request("/api/v1/study/library/entries", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryIds, blacklistContentHashes }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.code || "delete_failed");
    return result.data;
}

async function executePreviewLibraryResolution(request, location, entry) {
    const response = await request("/api/v1/study/library/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, entry }),
    });
    if (!response.ok) throw new Error("resolve_failed");
    return (await response.json()).data;
}

async function executeFetchLibraryLookupProviders(
    request,
    { schemaId, schemaVersion, layer },
) {
    const parameters = new URLSearchParams({ schemaId, layer });
    if (schemaVersion !== undefined)
        parameters.set("schemaVersion", String(schemaVersion));
    const response = await request(
        `/api/v1/study/library/lookup/providers?${parameters}`,
    );
    if (!response.ok) throw new Error("lookup_providers_failed");
    return (await response.json()).data;
}

async function executeFetchLibraryLookupSuggestions(
    request,
    providerId,
    entry,
) {
    const response = await request("/api/v1/study/library/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId, entry }),
    });
    if (!response.ok) throw new Error("lookup_failed");
    return (await response.json()).data;
}

async function executeLocalizeLibraryDefinition(
    request,
    translations,
    languages,
) {
    const response = await request(
        "/api/v1/study/library/definitions/localize",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ translations, languages }),
        },
    );
    const result = await response.json();
    if (!response.ok)
        throw new Error(result.error?.code || "localization_failed");
    return result.data;
}

/** Merge a duplicate draft or submit its additions for review at the canonical card's scope.
 * @example const { entry, request } = await mergeLibraryEntry(existing.id, draft);
 */
async function executeMergeLibraryEntry(request, entryId, proposedEntry) {
    const response = await request(
        `/api/v1/study/library/entries/${encodeURIComponent(entryId)}/merge`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(proposedEntry),
        },
    );
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload.error?.code ?? "request_failed");
        error.details = payload.error;
        throw error;
    }
    return (await response.json()).data;
}

async function executeImportLibraryEntries(request, location, document) {
    const response = await request("/api/v1/study/library/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, document }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.code ?? "import_failed");
    return result.data;
}

/** Store or retrieve the latest account-owned search without exposing its parameters in the URL. */
async function executeDictionarySearchContext(request, input) {
    const response = await request(
        "/api/v1/study/library/dictionary/context",
        input
            ? {
                  method: "PUT",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify(input),
              }
            : {},
    );
    if (!response.ok) throw new Error("search_context_failed");
    return (await response.json()).data;
}

async function executeUploadLibraryAudio(request, file, signal) {
    const response = await request("/api/v1/study/library/audio", {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
        signal,
    });
    if (!response.ok) throw new Error("audio_upload_failed");
    return (await response.json()).data;
}

async function executeUploadLibraryImage(request, file, signal) {
    const response = await request("/api/v1/study/library/images", {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
        signal,
    });
    const payload = await response.json();
    if (!response.ok)
        throw new Error(payload.error?.code ?? "image_upload_failed");
    return payload.data;
}

async function executeFetchLibraryImageUrl(
    request,
    entryId,
    fieldId,
    index,
    { signal, requestId } = {},
) {
    const response = await request(
        `/api/v1/study/library/${requestId ? "push-requests" : "entries"}/${encodeURIComponent(requestId ?? entryId)}/images/${encodeURIComponent(fieldId)}/${index}`,
        { signal },
    );
    if (!response.ok) throw new Error("image_load_failed");
    return URL.createObjectURL(await response.blob());
}

async function executeStageLibraryPromotion(request, requestId, proposedEntry) {
    const response = await request(
        `/api/v1/study/library/push-requests/${encodeURIComponent(requestId)}`,
        {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(proposedEntry),
        },
    );
    const payload = await response.json();
    if (!response.ok)
        throw new Error(payload.error?.code ?? "request_update_failed");
    return payload.data;
}

async function executeDiscardLibraryImage(
    request,
    value,
    { signal, keepalive = false } = {},
) {
    const response = await request("/api/v1/study/library/images", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ value }),
        signal,
        keepalive,
    });
    if (!response.ok) throw new Error("image_discard_failed");
    return (await response.json()).data;
}

const operations = {
    fetchLibrarySchemas: executeFetchLibrarySchemas,
    fetchLibraryLocations: executeFetchLibraryLocations,
    fetchLibraryForms: executeFetchLibraryForms,
    fetchLibraryEntries: executeFetchLibraryEntries,
    fetchLibraryEntry: executeFetchLibraryEntry,
    fetchViewedLibraryEntryIds: executeFetchViewedLibraryEntryIds,
    markLibraryEntriesViewed: executeMarkLibraryEntriesViewed,
    fetchLibraryAudioUrl: executeFetchLibraryAudioUrl,
    createLibraryEntry: executeCreateLibraryEntry,
    fetchLibraryPushRequests: executeFetchLibraryPushRequests,
    fetchSearchableDictionaryProviders:
        executeFetchSearchableDictionaryProviders,
    searchLibraryDictionary: executeSearchLibraryDictionary,
    requestLibraryPromotion: executeRequestLibraryPromotion,
    relocateLibraryEntry: executeRelocateLibraryEntry,
    requestLibraryUpdate: executeRequestLibraryUpdate,
    reviewLibraryPromotion: executeReviewLibraryPromotion,
    withdrawLibraryPromotion: executeWithdrawLibraryPromotion,
    moveLibraryEntryToPersonal: executeMoveLibraryEntryToPersonal,
    updateLibraryEntry: executeUpdateLibraryEntry,
    planLibraryEntryDeletion: executePlanLibraryEntryDeletion,
    deleteLibraryEntries: executeDeleteLibraryEntries,
    previewLibraryResolution: executePreviewLibraryResolution,
    fetchLibraryLookupProviders: executeFetchLibraryLookupProviders,
    fetchLibraryLookupSuggestions: executeFetchLibraryLookupSuggestions,
    localizeLibraryDefinition: executeLocalizeLibraryDefinition,
    mergeLibraryEntry: executeMergeLibraryEntry,
    importLibraryEntries: executeImportLibraryEntries,
    dictionarySearchContext: executeDictionarySearchContext,
    uploadLibraryAudio: executeUploadLibraryAudio,
    uploadLibraryImage: executeUploadLibraryImage,
    fetchLibraryImageUrl: executeFetchLibraryImageUrl,
    stageLibraryPromotion: executeStageLibraryPromotion,
    discardLibraryImage: executeDiscardLibraryImage,
};

/** The Library provider owns these flows; consumers resolve the current mount through ctx. */
export function registerLibraryClient(ctx) {
    const registerActions = ctx.capabilities.get("ui:scopedActions");
    if (!registerActions) throw new Error("scoped_actions_unavailable");
    const read = createOfflineReadCache({
        signal: ctx.signal,
        maxBytes: 16_000_000,
    });
    const offlineSchemas = new Set();
    const offlineReads = new Set([
        "fetchLibrarySchemas",
        "fetchLibraryLocations",
        "fetchLibraryForms",
        "fetchLibraryEntries",
        "fetchLibraryEntry",
        "fetchViewedLibraryEntryIds",
    ]);
    const outbox = ctx.capabilities.get("offline:outbox");
    if (!outbox) throw new Error("offline_delivery_unavailable");
    outbox.register(
        "study.viewed",
        ({ entryIds }) =>
            executeMarkLibraryEntriesViewed(
                (path, options) =>
                    apiFetch(path, { ...options, signal: ctx.signal }),
                entryIds,
            ),
        ctx.signal,
        { protectOnClose: false },
    );
    const actions = registerActions(
        ctx,
        "study:library",
        Object.fromEntries(
            Object.entries(operations).map(([name, execute]) => [
                name,
                async (input) => {
                    const signal = AbortSignal.any([
                        ctx.signal,
                        ...(input.signal ? [input.signal] : []),
                        ...input.args.flatMap((value) =>
                            value instanceof AbortSignal
                                ? [value]
                                : value?.signal instanceof AbortSignal
                                  ? [value.signal]
                                  : [],
                        ),
                    ]);
                    input.signal = signal;
                    signal.throwIfAborted();
                    const load = () =>
                        execute(
                            async (path, options = {}) => {
                                const response = await apiFetch(path, {
                                    ...options,
                                    signal: AbortSignal.any([
                                        signal,
                                        ...(options.signal
                                            ? [options.signal]
                                            : []),
                                    ]),
                                });
                                if ([401, 403].includes(response.status))
                                    throw Object.assign(
                                        new Error("library_access_denied"),
                                        { status: response.status },
                                    );
                                return response;
                            },
                            ...input.args,
                        );
                    if (name === "markLibraryEntriesViewed")
                        return deliverOrQueue(
                            ctx,
                            "study.viewed",
                            crypto.randomUUID(),
                            { entryIds: input.args[0] },
                            load,
                        );
                    if (offlineReads.has(name)) {
                        const cached = () =>
                            read(
                                JSON.stringify([name, input.args]),
                                load,
                                (data) => {
                                    if (name === "fetchLibraryEntries")
                                        return (
                                            Array.isArray(data) &&
                                            data.every((entry) =>
                                                offlineSchemas.has(
                                                    entry.schemaId,
                                                ),
                                            )
                                        );
                                    if (name === "fetchLibraryEntry")
                                        return offlineSchemas.has(
                                            data?.entry?.schemaId,
                                        );
                                    return true;
                                },
                            );
                        const result =
                            name === "fetchLibraryForms"
                                ? await readStudySnapshot(cached, [])
                                : await cached();
                        if (name === "fetchLibrarySchemas") {
                            for (const schema of Array.isArray(result)
                                ? result
                                : []) {
                                if (
                                    schema.metadata?.offline?.cache ===
                                    "lightweight"
                                )
                                    offlineSchemas.add(schema.id);
                                else offlineSchemas.delete(schema.id);
                            }
                        }
                        return result;
                    }
                    if (isOffline()) {
                        if (
                            [
                                "fetchSearchableDictionaryProviders",
                                "fetchLibraryLookupProviders",
                            ].includes(name)
                        )
                            return [];
                        throw new Error("offline_operation_unavailable");
                    }
                    return load();
                },
            ]),
        ),
    );
    ctx.capabilities.contribute("study:library:client", actions);
    registerEnrolledLibrarySnapshots(ctx, actions);
}

export const {
    fetchLibrarySchemas,
    fetchLibraryLocations,
    fetchLibraryForms,
    fetchLibraryEntries,
    fetchLibraryEntry,
    fetchViewedLibraryEntryIds,
    markLibraryEntriesViewed,
    fetchLibraryAudioUrl,
    createLibraryEntry,
    fetchLibraryPushRequests,
    fetchSearchableDictionaryProviders,
    searchLibraryDictionary,
    requestLibraryPromotion,
    relocateLibraryEntry,
    requestLibraryUpdate,
    reviewLibraryPromotion,
    withdrawLibraryPromotion,
    moveLibraryEntryToPersonal,
    updateLibraryEntry,
    planLibraryEntryDeletion,
    deleteLibraryEntries,
    previewLibraryResolution,
    fetchLibraryLookupProviders,
    fetchLibraryLookupSuggestions,
    localizeLibraryDefinition,
    mergeLibraryEntry,
    importLibraryEntries,
    dictionarySearchContext,
    uploadLibraryAudio,
    uploadLibraryImage,
    fetchLibraryImageUrl,
    stageLibraryPromotion,
    discardLibraryImage,
} = Object.fromEntries(
    Object.keys(operations).map((name) => [
        name,
        async (...args) => {
            const actions = uiCtx.capabilities.get("study:library:client");
            if (!actions) throw new Error("library_client_unavailable");
            return actions[name]({ args });
        },
    ]),
);
