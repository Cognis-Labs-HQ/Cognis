import { isOffline } from "/static/reuse/offline-state.js";
import { fetchLibraryEntry } from "/static/gateways/study/library-client.js";
import { cachedEntryDetail } from "../reuse/entry-graph.js";

export async function loadEntryDetail(entryId, entries, preferred) {
    if (preferred?.entry.id === entryId) return preferred;
    return isOffline()
        ? cachedEntryDetail(entryId, entries)
        : fetchLibraryEntry(entryId);
}
