/**
 * Render and bind caller-owned image thumbnails to lifecycle-scoped viewers.
 * Public exports: renderImagePreview renders thumbnail markup;
 * bindImagePreviews binds thumbnail activation; mountProvider registers actions.
 * @example const markup = renderImagePreview({ src: imageUrl, alt: label });
 */
import { escapeHtml } from "./escape-html.js";
import { openPopup } from "./popup.js";
import { waitForPopupPreparation } from "./popup/preparation.js";
import { ensurePageStylesheet } from "./page-styles.js";
import { createI18n } from "./i18n.js";
import { uiCtx } from "./ui-ctx.js";
import { registerScopedUiActions } from "./scoped-actions.js";
import { showToast } from "./toast.js";

/**
 * Render a thumbnail with an optional removal action. Data attributes belong to the caller.
 * @param {object} options Image, label and optional removal attributes.
 * @returns {string} Escaped thumbnail markup.
 */
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

/**
 * Bind dynamic thumbnails to the standard in-window popup; the caller owns image URLs.
 * @param {Element} root Thumbnail container.
 * @param {{signal?: AbortSignal}} options Caller lifetime.
 * @returns {void}
 */
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
            const preview = uiCtx.capabilities.get("ui:imagePreview");
            const retired = () =>
                signal?.aborted ||
                (preview &&
                    uiCtx.capabilities.get("ui:imagePreview") !== preview);
            try {
                if (!preview) throw new Error("image_preview_unavailable");
                await preview.open({ src, alt: image.alt, signal });
                if (button.isConnected && !signal?.aborted)
                    button.focus({ preventScroll: true });
            } catch (error) {
                if (retired() || error?.name === "AbortError") return;
                const log = console.error.bind(console);
                log("[image-preview] Failed to open viewer", {
                    component: "ui.imagePreview",
                    operation: "open",
                    errorName: error?.name,
                });
                const i18n = await waitForPopupPreparation(
                    createI18n(),
                    signal,
                ).catch((localeError) => {
                    if (retired()) return null;
                    throw localeError;
                });
                if (retired()) return;
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
    const i18n = await waitForPopupPreparation(createI18n(), signal);
    if (signal.aborted) return;
    let dismissPopup;
    const abort = () => dismissPopup?.();
    signal.addEventListener("abort", abort, { once: true });
    try {
        await openPopup({
            signal,
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

/**
 * @param {object} ctx Lifecycle-scoped UI provider context.
 * @returns {Promise<void>} Resolves after publishing preview controls.
 */
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
