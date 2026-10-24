import { uiCtx } from "/static/reuse/ui-ctx.js";

export function bindDrawingGridPreviews(root, signal) {
    if (signal?.aborted) return;
    const observe = uiCtx.capabilities.get("study:drawing:observe");
    if (!observe) return;
    let activeCard;
    const concealed = new Map();
    const restore = (preview, previous) => {
        preview.classList.remove("library-entry-card--drawing");
        preview.inert = previous.inert;
        if (previous.ariaHidden === null)
            preview.removeAttribute("aria-hidden");
        else preview.setAttribute("aria-hidden", previous.ariaHidden);
        concealed.delete(preview);
    };
    const refresh = () => {
        const previews = new Set(
            root.querySelectorAll("[data-library-preview-label]"),
        );
        for (const [preview, previous] of concealed) {
            if (
                !previews.has(preview) ||
                preview.dataset.libraryEntry !== activeCard?.id ||
                preview.dataset.libraryPreviewLabel !== activeCard?.label
            ) {
                restore(preview, previous);
            }
        }
        for (const preview of previews) {
            if (
                preview.dataset.libraryEntry !== activeCard?.id ||
                preview.dataset.libraryPreviewLabel !== activeCard?.label ||
                concealed.has(preview)
            )
                continue;
            concealed.set(preview, {
                inert: preview.inert,
                ariaHidden: preview.getAttribute("aria-hidden"),
            });
            preview.classList.add("library-entry-card--drawing");
            preview.inert = true;
            preview.setAttribute("aria-hidden", "true");
        }
    };
    const release = observe(
        (card) => {
            activeCard = card;
            refresh();
        },
        { signal },
    );
    const mutations = new MutationObserver(refresh);
    mutations.observe(root, { childList: true, subtree: true });
    signal?.addEventListener(
        "abort",
        () => {
            mutations.disconnect();
            release();
            for (const [preview, previous] of concealed)
                restore(preview, previous);
        },
        { once: true },
    );
}
