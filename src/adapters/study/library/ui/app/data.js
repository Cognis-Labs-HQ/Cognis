import { showToast } from "/static/reuse/toast.js";
import {
    fetchLibraryEntries,
    fetchLibrarySchemas,
    fetchViewedLibraryEntryIds,
} from "/static/gateways/study/ui/library-client.js";

export async function loadLibrary(languageCode, i18n) {
    let schemas = [];
    let entries = [];
    try {
        schemas = await fetchLibrarySchemas(languageCode);
        const accountId = localStorage.getItem("cognis_account");
        const locations = [
            { scope: "global" },
            ...(accountId ? [{ scope: "user", scopeId: accountId }] : []),
        ];
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
            isNew: !viewed.has(entry.id),
        }));
    } catch {
        showToast(i18n.t("gateway.study.library_load_error"), {
            type: "error",
        });
    }
    return { schemas, entries };
}
