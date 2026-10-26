import { escapeHtml } from "./escape-html.js";
import { ensurePersistentStylesheet } from "./page-styles.js";

/** Render shared top-of-page notices; callers supply sanitized rich text and owned action markup. */
export function renderTopBanner({
    title,
    bodyHtml = "",
    actionsHtml = "",
    variant = "info",
}) {
    const variants = {
        info: "top-banner--info",
        success: "top-banner--success",
        warning: "top-banner--warning",
        danger: "top-banner--danger",
    };
    if (!Object.hasOwn(variants, variant))
        throw new TypeError("invalid_banner_variant");
    return `<section class="top-banner ${variants[variant]}" role="status" aria-live="polite"><div class="top-banner-content"><strong class="top-banner-title">${escapeHtml(title)}</strong>${bodyHtml ? `<div class="top-banner-message">${bodyHtml}</div>` : ""}</div>${actionsHtml ? `<div class="top-banner-actions">${actionsHtml}</div>` : ""}</section>`;
}

export function createTopBanners() {
    const entries = new Map();
    let container;
    const render = () => {
        if (!entries.size) {
            container?.remove();
            container = null;
            return;
        }
        if (!container?.isConnected) {
            container = document.createElement("div");
            container.id = "site-top-banners";
        }
        document.body.prepend(container);
        container.replaceChildren(
            ...[...entries.values()]
                .sort((left, right) => left.priority - right.priority)
                .map(({ element }) => element),
        );
    };
    let stylesPromise;
    const prepare = () =>
        (stylesPromise ??= Promise.all([
            ensurePersistentStylesheet("/static/styles/reuse/top-banners.css"),
            ensurePersistentStylesheet("/static/styles/reuse/buttons.css"),
        ]).catch((error) => {
            stylesPromise = null;
            console.info("[ui] banner styles unavailable", {
                operation: "loadBannerStyles",
                errorName: error?.name,
            });
        }));
    return {
        prepare,
        publish(id, descriptor, { priority = 0, signal } = {}) {
            const element = document.createElement("div");
            element.dataset.broadcast = id;
            element.innerHTML = renderTopBanner(descriptor);
            if (!id || !element || !Number.isFinite(priority))
                throw new TypeError("invalid_top_banner");
            signal?.throwIfAborted();
            const entry = { element, priority };
            entries.set(id, entry);
            render();
            const dispose = () => {
                signal?.removeEventListener("abort", dispose);
                if (entries.get(id) !== entry) return;
                entries.delete(id);
                render();
            };
            signal?.addEventListener("abort", dispose, { once: true });
            void prepare();
            return { element, remove: dispose };
        },
    };
}
