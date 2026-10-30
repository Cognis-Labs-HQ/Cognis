import {
    isOfflineContentMiss,
    readStudySnapshot,
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
        const batches = await Promise.all(
            schemas.flatMap((schema) =>
                locations.map((location) =>
                    readStudySnapshot(
                        () =>
                            fetchLibraryEntries({
                                ...location,
                                schemaId: schema.id,
                            }),
                        null,
                    ),
                ),
            ),
        );
        entries = batches.filter(Array.isArray).flat();
        const viewedIds = await readStudySnapshot(
            () => fetchViewedLibraryEntryIds(),
            null,
        );
        if (viewedIds) {
            const viewed = new Set(viewedIds);
            entries = entries.map((entry) => ({
                ...entry,
                isNew: !entry.relocatedAt && !viewed.has(entry.id),
            }));
        }
        if (!entries.length && batches.some((batch) => batch === null))
            showOfflineContentNotice(i18n, signal);
    } catch (error) {
        if (
            [401, 403].includes(error?.status) ||
            ["offline_access_denied", "offline_account_changed"].includes(
                error?.message,
            ) ||
            error?.name === "AbortError"
        )
            throw error;
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
