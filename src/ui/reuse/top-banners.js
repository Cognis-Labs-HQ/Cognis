import { escapeHtml } from "./escape-html.js";
import { ensurePersistentStylesheet } from "./page-styles.js";

/** Render shared top-of-page notices; callers supply sanitized rich text and owned action markup. */
export function renderTopBanner({
    title,
    bodyHtml = "",
    actionsHtml = "",
    variant = "info",
    background,
}) {
    const variants = {
        info: "top-banner--info",
        success: "top-banner--success",
        warning: "top-banner--warning",
        danger: "top-banner--danger",
    };
    if (!Object.hasOwn(variants, variant))
        throw new TypeError("invalid_banner_variant");
    if (
        background !== undefined &&
        (typeof background !== "string" ||
            !background.trim() ||
            /[;{}]/.test(background))
    )
        throw new TypeError("invalid_banner_background");
    return `<section ${background ? `style="--top-banner-background:${escapeHtml(background)}" ` : ""}class="top-banner ${variants[variant]}" role="status" aria-live="polite"><div class="top-banner-content"><strong class="top-banner-title">${escapeHtml(title)}</strong>${bodyHtml ? `<div class="top-banner-message">${bodyHtml}</div>` : ""}</div>${actionsHtml ? `<div class="top-banner-actions">${actionsHtml}</div>` : ""}</section>`;
}

export function createTopBanners() {
    const entries = new Map();
    let container;
    let observer;
    let scrollScope;
    let collapsed = false;
    let previousScroll = 0;
    let previousDocumentHeight = 0;
    const updateLayout = () => {
        if (!entries.size) return;
        let expanded = 0;
        let visible = 0;
        for (const entry of entries.values()) {
            const height = entry.element.getBoundingClientRect().height;
            const naturalHeight = entry.element
                .querySelector(".top-banner")
                .getBoundingClientRect().height;
            entry.element.style.setProperty(
                "--top-banner-expanded-height",
                `${naturalHeight}px`,
            );
            expanded += naturalHeight;
            visible += height;
        }
        if (container) container.style.height = `${expanded}px`;
        document.documentElement.style.setProperty(
            "--site-top-banner-height",
            `${visible}px`,
        );
    };
    const onScroll = () => {
        const scroll = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight;
        // Sticky offsets can move the scroll anchor while the banner animates.
        // Ignore that movement when deciding the user's scroll direction.
        const scrollDelta = scroll - previousScroll;
        const heightDelta = documentHeight - previousDocumentHeight;
        const movement =
            collapsed && scrollDelta < 0 && heightDelta < 0
                ? scrollDelta - heightDelta
                : scrollDelta;
        if (movement > 1) collapsed = true;
        else if (movement < -1 || scroll === 0) collapsed = false;
        previousScroll = scroll;
        previousDocumentHeight = documentHeight;
        for (const entry of entries.values())
            entry.element.dataset.collapsed = String(
                collapsed && entry.collapsible,
            );
        updateLayout();
    };
    const render = () => {
        if (!entries.size) {
            container?.remove();
            container = null;
            observer?.disconnect();
            observer = null;
            scrollScope?.abort();
            scrollScope = null;
            document.documentElement.style.removeProperty(
                "--site-top-banner-height",
            );
            return;
        }
        if (!container?.isConnected) {
            container = document.createElement("div");
            container.id = "site-top-banners";
            scrollScope = new AbortController();
            previousScroll = window.scrollY;
            previousDocumentHeight = document.documentElement.scrollHeight;
            collapsed = false;
            window.addEventListener("scroll", onScroll, {
                passive: true,
                signal: scrollScope.signal,
            });
            window.addEventListener("resize", updateLayout, {
                signal: scrollScope.signal,
            });
            observer = new ResizeObserver(updateLayout);
        }
        document.body.prepend(container);
        container.replaceChildren(
            ...[...entries.values()]
                .sort((left, right) => left.priority - right.priority)
                .map(({ element }) => element),
        );
        for (const entry of entries.values()) observer.observe(entry.element);
        updateLayout();
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
            if (
                descriptor.collapsible !== undefined &&
                typeof descriptor.collapsible !== "boolean"
            )
                throw new TypeError("invalid_banner_collapsible");
            if (
                descriptor.background !== undefined &&
                typeof CSS !== "undefined" &&
                !CSS.supports("background", descriptor.background)
            )
                throw new TypeError("invalid_banner_background");
            const element = document.createElement("div");
            element.dataset.broadcast = id;
            element.innerHTML = renderTopBanner(descriptor);
            element.dataset.collapsible = String(
                descriptor.collapsible === true,
            );
            element.dataset.collapsed = String(
                collapsed && descriptor.collapsible === true,
            );
            if (descriptor.collapsible) {
                element.tabIndex = 0;
                element.setAttribute("aria-label", descriptor.title);
            }
            if (!id || !element || !Number.isFinite(priority))
                throw new TypeError("invalid_top_banner");
            signal?.throwIfAborted();
            const previous = entries.get(id);
            if (previous) observer?.unobserve(previous.element);
            const entry = {
                element,
                priority,
                collapsible: descriptor.collapsible === true,
            };
            entries.set(id, entry);
            render();
            const dispose = () => {
                signal?.removeEventListener("abort", dispose);
                if (entries.get(id) !== entry) return;
                observer?.unobserve(element);
                entries.delete(id);
                render();
            };
            signal?.addEventListener("abort", dispose, { once: true });
            void prepare().then(updateLayout);
            return { element, remove: dispose };
        },
    };
}
