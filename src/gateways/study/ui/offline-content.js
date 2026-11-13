import { isOffline } from "/static/reuse/offline-state.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

export function isOfflineContentMiss(error) {
    return isOffline() && error?.message === "offline_read_unavailable";
}

export async function readStudySnapshot(load, empty) {
    try {
        return await load();
    } catch (error) {
        if (!isOfflineContentMiss(error)) throw error;
        return structuredClone(empty);
    }
}

const notices = new WeakSet();

/** Keep a cache miss distinct from access denial and show the notice after the page can mount. */
export function showOfflineContentNotice(i18n, signal) {
    if (signal && notices.has(signal)) return;
    if (signal) notices.add(signal);
    void uiCtx
        .runFlow("defer-page-action", {
            action: async () => {
                if (signal?.aborted || !isOffline()) return;
                try {
                    await openPopup({
                        title: i18n.t("ui.reuse.study"),
                        body: escapeHtml(
                            i18n.t("ui.reuse.offline_no_cached_content"),
                        ),
                        actions: [
                            {
                                id: "close",
                                label: i18n.t("ui.reuse.close"),
                                variant: "neutral",
                            },
                        ],
                    });
                } catch (error) {
                    console.info("[study] offline notice unavailable", {
                        operation: "showOfflineContent",
                        errorName: error?.name,
                    });
                }
            },
        })
        .catch((error) =>
            console.info("[study] offline notice could not be scheduled", {
                operation: "scheduleOfflineContent",
                errorName: error?.name,
            }),
        );
}
