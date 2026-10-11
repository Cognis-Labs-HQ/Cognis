import { markLibraryEntriesViewed } from "/static/gateways/study/ui/library-client.js";

export function bindViewedEntries(root, getEntries, signal) {
    const markViewed = (control) => {
        const entry = getEntries().find(
            ({ id }) => id === control?.dataset.libraryEntry,
        );
        if (!entry?.isNew) return;
        entry.isNew = false;
        root.querySelectorAll(
            `[data-library-entry="${CSS.escape(entry.id)}"]`,
        ).forEach((card) =>
            card
                .closest(".library-entry-card-shell")
                ?.querySelector(".library-new-pill")
                ?.remove(),
        );
        void markLibraryEntriesViewed([entry.id]).catch(() => {
            entry.isNew = true;
        });
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
