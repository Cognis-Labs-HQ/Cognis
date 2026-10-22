import { markLibraryEntriesViewed } from "/static/gateways/study/library-client.js";
import { showToast } from "/static/reuse/toast.js";
import { reportClientError } from "/static/reuse/error-reporting.js";

const pendingViews = new WeakMap();

export async function markEntryViewed(root, entry, entries, i18n) {
    if (!entry?.id) return false;
    const matches = entries.filter(({ id }) => id === entry.id);
    const knownViewed =
        entry.isNew === false || matches.some(({ isNew }) => isNew === false);
    if (!knownViewed) {
        let requests = pendingViews.get(root);
        if (!requests) {
            requests = new Map();
            pendingViews.set(root, requests);
        }
        let request = requests.get(entry.id);
        if (!request) {
            request = Promise.resolve()
                .then(() => markLibraryEntriesViewed([entry.id]))
                .then(
                    () => true,
                    (error) => {
                        reportClientError({
                            component: "study-library",
                            operation: "markEntryViewed",
                            errorName: error?.name,
                        });
                        showToast(
                            i18n.t("adapter.study.library.viewed_save_error"),
                            {
                                variant: "error",
                            },
                        );
                        return false;
                    },
                )
                .finally(() => requests.delete(entry.id));
            requests.set(entry.id, request);
        }
        if (!(await request)) return false;
    }
    entry.isNew = false;
    matches.forEach((candidate) => {
        candidate.isNew = false;
    });
    root.querySelectorAll(
        `[data-library-entry-status="${CSS.escape(entry.id)}"] .library-new-pill`,
    ).forEach((pill) => pill.remove());
    return true;
}

export function bindViewedEntries(root, getEntries, signal, i18n) {
    const markViewed = (control) => {
        const entries = getEntries();
        const entry = entries.find(
            ({ id }) => id === control?.dataset.libraryEntry,
        );
        if (entry?.isNew) void markEntryViewed(root, entry, entries, i18n);
    };
    root.addEventListener(
        "pointerover",
        (event) => {
            const status = event.target.closest("[data-library-entry-status]");
            const control = event.target.closest("[data-library-entry]");
            markViewed(
                control ??
                    (status
                        ? {
                              dataset: {
                                  libraryEntry:
                                      status.dataset.libraryEntryStatus,
                              },
                          }
                        : null),
            );
        },
        { capture: true, signal },
    );
    return markViewed;
}
