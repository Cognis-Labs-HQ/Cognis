import { escapeHtml } from "./escape-html.js";
import { openPopup } from "./popup.js";
import { ensurePageStylesheet } from "./page-styles.js";
import { createI18n } from "./i18n.js";
import { uiCtx } from "./ui-ctx.js";
import { registerScopedUiActions } from "./scoped-actions.js";
import { showToast } from "./toast.js";

/** Render a thumbnail with an optional removal action. Data attributes belong to the caller. */
export function renderImagePreview({
    src = "",
    alt = "",
    removeId,
    removeLabel,
    disabled = false,
    large = false,
    imageAttributes = {},
}) {
    if (removeId !== undefined && !removeLabel)
        throw new TypeError("image_preview_remove_label_required");
    const attributes = Object.entries(imageAttributes)
        .map(([name, value]) => {
            if (!/^data-[a-z0-9-]+$/.test(name))
                throw new TypeError("invalid_image_preview_attribute");
            return ` ${name}="${escapeHtml(value)}"`;
        })
        .join("");
    return `<span class="image-preview${large ? " image-preview--large" : ""}"><button class="image-preview-open" type="button" data-image-preview-open><img loading="lazy" alt="${escapeHtml(alt)}"${src ? ` src="${escapeHtml(src)}"` : ""}${attributes}></button>${removeId === undefined ? "" : `<button class="btn-cancel image-preview-remove" type="button" data-image-preview-remove="${escapeHtml(removeId)}"${disabled ? " disabled" : ""} aria-label="${escapeHtml(removeLabel)}">×</button>`}</span>`;
}

/** Bind dynamic thumbnails to the standard in-window popup; the caller owns image URLs. */
export function bindImagePreviews(root, { signal }) {
    let opened = false;
    root.addEventListener(
        "click",
        async (event) => {
            const button = event.target.closest("[data-image-preview-open]");
            if (!button || event.defaultPrevented || signal?.aborted) return;
            event.preventDefault();
            const image = button.querySelector("img");
            const src = image?.getAttribute("src");
            if (!src || opened) return;
            opened = true;
            try {
                const preview = uiCtx.capabilities.get("ui:imagePreview");
                if (!preview) throw new Error("image_preview_unavailable");
                await preview.open({ src, alt: image.alt, signal });
                if (button.isConnected && !signal?.aborted)
                    button.focus({ preventScroll: true });
            } catch {
                if (signal?.aborted) return;
                const i18n = await createI18n();
                showToast(i18n.t("ui.reuse.image_preview_failed"), {
                    variant: "error",
                });
            } finally {
                opened = false;
            }
        },
        { signal },
    );
}

async function openImagePreview({ src, alt, signal }) {
    const i18n = await createI18n();
    if (signal.aborted) return;
    let dismissPopup;
    const abort = () => dismissPopup?.();
    signal.addEventListener("abort", abort, { once: true });
    try {
        await openPopup({
            body: `<img class="image-preview-full" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`,
            actions: [],
            maxWidth: "calc(100vw - 3rem)",
            onOpen: (overlay, dismiss) => {
                dismissPopup = dismiss;
                overlay.classList.add("image-preview-popup");
                overlay.querySelector(".popup-heading").remove();
                overlay.removeAttribute("aria-labelledby");
                overlay.setAttribute(
                    "aria-label",
                    i18n.t("ui.reuse.image_preview"),
                );
                overlay
                    .querySelector('[data-popup-action="close"]')
                    .setAttribute("aria-label", i18n.t("ui.reuse.close"));
                if (signal.aborted) dismiss();
            },
        });
    } finally {
        signal.removeEventListener("abort", abort);
    }
}

export async function mountProvider(ctx) {
    await ensurePageStylesheet("/static/styles/reuse/image-preview.css");
    ctx.signal.throwIfAborted();
    const actions = registerScopedUiActions(ctx, "ui:imagePreview", {
        open: (input) =>
            openImagePreview({
                ...input,
                signal: input.signal
                    ? AbortSignal.any([input.signal, ctx.signal])
                    : ctx.signal,
            }),
    });
    ctx.capabilities.contribute("ui:imagePreview", {
        render: renderImagePreview,
        bind: bindImagePreviews,
        ...actions,
    });
}
