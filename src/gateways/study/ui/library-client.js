import { apiFetch } from "/static/reuse/api-client.js";

export async function fetchLibrarySchemas(languageCode) {
    const query = new URLSearchParams();
    if (languageCode) query.set("language", languageCode);
    const suffix = query.size > 0 ? `?${query}` : "";
    const response = await apiFetch(`/api/v1/study/library/schemas${suffix}`);
    if (!response.ok) throw new Error("schemas_failed");
    return (await response.json()).data;
}

export async function fetchLibraryLocations(languageCode) {
    const query = new URLSearchParams();
    if (languageCode) query.set("language", languageCode);
    const suffix = query.size > 0 ? `?${query}` : "";
    const response = await apiFetch(`/api/v1/study/library/locations${suffix}`);
    if (!response.ok) throw new Error("locations_failed");
    return (await response.json()).data;
}

export async function fetchLibraryForms() {
    const response = await apiFetch("/api/v1/study/library/forms");
    if (!response.ok) throw new Error("forms_failed");
    return (await response.json()).data;
}

export async function fetchLibraryEntries({
    scope,
    scopeId,
    schemaId,
    layer,
    entryIds,
    sourceRecordIds,
}) {
    const query = new URLSearchParams({ scope });
    if (scopeId) query.set("scopeId", scopeId);
    if (schemaId) query.set("schemaId", schemaId);
    if (layer) query.set("layer", layer);
    for (const id of entryIds ?? []) query.append("entryId", id);
    for (const id of sourceRecordIds ?? []) query.append("sourceRecordId", id);
    const response = await apiFetch(`/api/v1/study/library/entries?${query}`);
    if (!response.ok) throw new Error("entries_failed");
    return (await response.json()).data;
}

export async function fetchLibraryEntry(entryId) {
    const response = await apiFetch(
        `/api/v1/study/library/entries/${encodeURIComponent(entryId)}/trace`,
    );
    if (!response.ok) throw new Error("entry_failed");
    return (await response.json()).data;
}

export async function fetchViewedLibraryEntryIds() {
    const response = await apiFetch("/api/v1/study/library/viewed-entries");
    if (!response.ok) throw new Error("viewed_entries_failed");
    return (await response.json()).data;
}

export async function markLibraryEntriesViewed(entryIds) {
    const response = await apiFetch("/api/v1/study/library/viewed-entries", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryIds }),
    });
    if (!response.ok) throw new Error("mark_viewed_failed");
}

export async function fetchLibraryAudioUrl(
    entryId,
    fieldId,
    { signal, transformation, refresh = false } = {},
) {
    const response = await apiFetch(
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

export async function createLibraryEntry(location, entry) {
    const response = await apiFetch("/api/v1/study/library/entries", {
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

export async function fetchLibraryPushRequests({ status } = {}) {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    const response = await apiFetch(
        `/api/v1/study/library/push-requests${status ? `?${query}` : ""}`,
    );
    if (!response.ok) throw new Error("requests_failed");
    return (await response.json()).data;
}

export async function fetchSearchableDictionaryProviders(language) {
    const response = await apiFetch(
        `/api/v1/study/library/dictionary/providers?${new URLSearchParams({ language })}`,
    );
    if (!response.ok) throw new Error("lookup_providers_failed");
    return (await response.json()).data;
}

export async function searchLibraryDictionary(input) {
    const response = await apiFetch("/api/v1/study/library/dictionary/search", {
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

export async function requestLibraryPromotion(entryId, destination) {
    const response = await apiFetch("/api/v1/study/library/push-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryId, destination }),
    });
    if (!response.ok) throw new Error("request_failed");
    return (await response.json()).data;
}

export async function relocateLibraryEntry(entryId, destination) {
    const response = await apiFetch(
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

export async function requestLibraryUpdate(entryId, proposedEntry) {
    const response = await apiFetch("/api/v1/study/library/push-requests", {
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

export async function reviewLibraryPromotion(requestId, decision) {
    const response = await apiFetch(
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

export async function withdrawLibraryPromotion(requestId) {
    const response = await apiFetch(
        `/api/v1/study/library/push-requests/${encodeURIComponent(requestId)}`,
        { method: "DELETE" },
    );
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error?.code ?? "withdraw_failed");
    }
    return (await response.json()).data;
}

export async function moveLibraryEntryToPersonal(entryId) {
    const response = await apiFetch(
        `/api/v1/study/library/entries/${encodeURIComponent(entryId)}/move-to-personal`,
        { method: "POST" },
    );
    if (!response.ok) throw new Error("move_failed");
    return (await response.json()).data;
}

export async function updateLibraryEntry(entryId, entry) {
    const response = await apiFetch(
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

export async function planLibraryEntryDeletion(entryIds) {
    const response = await apiFetch(
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

export async function deleteLibraryEntries(
    entryIds,
    { blacklistContentHashes = false } = {},
) {
    const response = await apiFetch("/api/v1/study/library/entries", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryIds, blacklistContentHashes }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.code || "delete_failed");
    return result.data;
}

export async function previewLibraryResolution(location, entry) {
    const response = await apiFetch("/api/v1/study/library/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, entry }),
    });
    if (!response.ok) throw new Error("resolve_failed");
    return (await response.json()).data;
}

export async function fetchLibraryLookupProviders({
    schemaId,
    schemaVersion,
    layer,
}) {
    const parameters = new URLSearchParams({ schemaId, layer });
    if (schemaVersion !== undefined)
        parameters.set("schemaVersion", String(schemaVersion));
    const response = await apiFetch(
        `/api/v1/study/library/lookup/providers?${parameters}`,
    );
    if (!response.ok) throw new Error("lookup_providers_failed");
    return (await response.json()).data;
}

export async function fetchLibraryLookupSuggestions(providerId, entry) {
    const response = await apiFetch("/api/v1/study/library/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId, entry }),
    });
    if (!response.ok) throw new Error("lookup_failed");
    return (await response.json()).data;
}

export async function localizeLibraryDefinition(translations, languages) {
    const response = await apiFetch(
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
export async function mergeLibraryEntry(entryId, proposedEntry) {
    const response = await apiFetch(
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

export async function importLibraryEntries(location, document) {
    const response = await apiFetch("/api/v1/study/library/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, document }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.code ?? "import_failed");
    return result.data;
}

/** Store or retrieve the latest account-owned search without exposing its parameters in the URL. */
export async function dictionarySearchContext(input) {
    const response = await apiFetch(
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

export async function uploadLibraryAudio(file, signal) {
    const response = await apiFetch("/api/v1/study/library/audio", {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
        signal,
    });
    if (!response.ok) throw new Error("audio_upload_failed");
    return (await response.json()).data;
}

export async function uploadLibraryImage(file, signal) {
    const response = await apiFetch("/api/v1/study/library/images", {
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

export async function fetchLibraryImageUrl(
    entryId,
    fieldId,
    index,
    { signal, requestId } = {},
) {
    const response = await apiFetch(
        `/api/v1/study/library/${requestId ? "push-requests" : "entries"}/${encodeURIComponent(requestId ?? entryId)}/images/${encodeURIComponent(fieldId)}/${index}`,
        { signal },
    );
    if (!response.ok) throw new Error("image_load_failed");
    return URL.createObjectURL(await response.blob());
}

export async function stageLibraryPromotion(requestId, proposedEntry) {
    const response = await apiFetch(
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
