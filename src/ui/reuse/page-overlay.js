import { ensurePageStylesheet } from "./page-styles.js";
import { registerScopedUiActions } from "./scoped-actions.js";

/** Mount a floating boundary inside the visible page area; the shell owns its geometry. */
export function createPageOverlay({ signal, bottomInset = 0 }) {
    signal.throwIfAborted();
    if (!Number.isFinite(bottomInset) || bottomInset < 0)
        throw new TypeError("invalid_page_overlay_inset");
    const page = document.querySelector(".app-page__main");
    if (!page) throw new Error("page_overlay_host_unavailable");
    const footer = document.querySelector(".global-footer");
    const header = document.querySelector(".site-header");
    const element = document.createElement("div");
    element.className = "page-overlay-boundary";
    const controller = new AbortController();
    const fit = () => {
        const bounds = page.getBoundingClientRect();
        const bottom = Math.min(
            footer?.getBoundingClientRect().top ?? window.innerHeight,
            window.innerHeight,
        );
        const top = Math.max(0, bounds.top);
        Object.assign(element.style, {
            left: `${bounds.left}px`,
            top: `${top}px`,
            width: `${bounds.width}px`,
            height: `${Math.max(0, bottom - top - bottomInset)}px`,
        });
    };
    const observer = new ResizeObserver(fit);
    const destroy = () => {
        controller.abort();
        observer.disconnect();
        signal.removeEventListener("abort", destroy);
        element.remove();
    };
    document.body.append(element);
    for (const target of [page, footer, header]) {
        if (target) observer.observe(target);
    }
    window.addEventListener("resize", fit, { signal: controller.signal });
    window.addEventListener("scroll", fit, {
        signal: controller.signal,
        passive: true,
    });
    signal.addEventListener("abort", destroy, { once: true });
    fit();
    return { element, destroy };
}

/** Publish an executable, provider-scoped page overlay contract. */
export async function mountProvider(ctx) {
    await ensurePageStylesheet("/static/styles/reuse/page-overlay.css");
    ctx.signal.throwIfAborted();
    const actions = registerScopedUiActions(ctx, "ui:pageOverlay", {
        create: (input = {}) =>
            createPageOverlay({
                ...input,
                signal: input.signal
                    ? AbortSignal.any([input.signal, ctx.signal])
                    : ctx.signal,
            }),
    });
    ctx.capabilities.contribute("ui:pageOverlay", actions);
}
