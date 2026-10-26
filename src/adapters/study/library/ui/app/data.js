import {
    isOfflineContentMiss,
    showOfflineContentNotice,
} from "/static/gateways/study/offline-content.js";
import { showToast } from "/static/reuse/toast.js";
import {
    fetchLibraryEntries,
    fetchLibrarySchemas,
    fetchViewedLibraryEntryIds,
    fetchLibraryLocations,
} from "/static/gateways/study/library-client.js";

export async function loadLibrary(languageCode, i18n, { signal } = {}) {
    let schemas = [];
    let entries = [];
    try {
        schemas = await fetchLibrarySchemas(languageCode);
        const access = await fetchLibraryLocations();
        const locations = access.readable;
        entries = (
            await Promise.all(
                schemas.flatMap((schema) =>
                    locations.map((location) =>
                        fetchLibraryEntries({
                            ...location,
                            schemaId: schema.id,
                        }),
                    ),
                ),
            )
        ).flat();
        const viewed = new Set(await fetchViewedLibraryEntryIds());
        entries = entries.map((entry) => ({
            ...entry,
            isNew: !entry.relocatedAt && !viewed.has(entry.id),
        }));
    } catch (error) {
        if (isOfflineContentMiss(error)) {
            showOfflineContentNotice(i18n, signal);
            return { schemas, entries: [] };
        }
        showToast(i18n.t("gateway.study.library_load_error"), {
            variant: "error",
        });
    }
    return { schemas, entries };
}
