import { apiFetch } from "/static/reuse/api-client.js";

export async function fetchLibrarySchemas(languageCode) {
    const query = new URLSearchParams();
    if (languageCode) query.set("language", languageCode);
    const suffix = query.size > 0 ? `?${query}` : "";
    const response = await apiFetch(`/api/v1/study/library/schemas${suffix}`);
    if (!response.ok) throw new Error("schemas_failed");
    return (await response.json()).data;
}

export async function fetchLibraryEntries({ scope, scopeId, schemaId, layer }) {
    const query = new URLSearchParams({ scope });
    if (scopeId) query.set("scopeId", scopeId);
    if (schemaId) query.set("schemaId", schemaId);
    if (layer) query.set("layer", layer);
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

export async function createLibraryEntry(location, entry) {
    const response = await apiFetch("/api/v1/study/library/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location, entry }),
    });
    if (!response.ok) throw new Error("create_failed");
    return (await response.json()).data;
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

export async function fetchLibraryLookupSuggestions(entry) {
    const response = await apiFetch("/api/v1/study/library/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error("lookup_failed");
    return (await response.json()).data;
}
