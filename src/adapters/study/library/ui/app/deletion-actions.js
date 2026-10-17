import { showToast } from "/static/reuse/toast.js";
import { deleteLibraryEntries } from "/static/gateways/study/ui/library-client.js";
import {
    confirmEntryDeletion,
    deletionErrorKey,
    setSelectionMode,
} from "./selection.js";

const deletionOperations = new WeakSet();

export async function deleteLibrarySelection({
    root,
    entries,
    schemas,
    i18n,
    onDeleted,
}) {
    if (deletionOperations.has(root)) return;
    deletionOperations.add(root);
    const button = root.querySelector("[data-library-delete-selection]");
    if (button) button.disabled = true;
    try {
        const request = await confirmEntryDeletion(
            root,
            entries,
            schemas,
            i18n,
        );
        if (!request) return;
        const deletion = await deleteLibraryEntries(request.entryIds, {
            blacklistContentHashes: request.blacklistContentHashes,
        });
        onDeleted(
            entries.filter((entry) => !deletion.entryIds.includes(entry.id)),
        );
        setSelectionMode(root, false);
        showToast(i18n.t("gateway.study.library_delete_success"), {
            variant: "success",
        });
    } catch (error) {
        showToast(i18n.t(deletionErrorKey(error)), { variant: "error" });
    } finally {
        deletionOperations.delete(root);
        if (button?.isConnected) button.disabled = false;
    }
}
