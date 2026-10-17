import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

export async function choosePracticeMode(i18n, name, signal) {
    if (signal?.aborted) return null;
    let dismissPopup;
    const abort = () => {
        void dismissPopup?.();
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
        return await openPopup({
            title: i18n.t("adapter.study.flashcards.practice_choose_mode"),
            body: escapeHtml(name),
            actions: ["reading", "writing"].map((mode) => ({
                id: mode,
                label: i18n.t(`adapter.study.flashcards.practice_${mode}`),
                variant: "neutral",
            })),
            onOpen: (_overlay, dismiss) => {
                dismissPopup = dismiss;
                if (signal?.aborted) abort();
            },
        });
    } finally {
        signal?.removeEventListener("abort", abort);
    }
}
