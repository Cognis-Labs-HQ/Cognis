/**
 * Shares viewport and input presentation with Composer elements and reader surfaces.
 * Exports composerPresentation to measure a host, applyComposerPresentation to
 * publish styling hooks, and watchComposerPresentation to track a surface lifetime.
 * @example const presentation = composerPresentation(element);
 * @param {HTMLElement} host Rendered card or composition container.
 * @returns {Readonly<{compact: boolean, layout: string, drawer: boolean, touch: boolean}>} Current presentation.
 */
import {
    isCompactWidth,
    COMPOSER_MEDIUM_BREAKPOINT,
    COMPOSER_DRAWER_BREAKPOINT,
} from "./responsive-layout.js";
export function composerPresentation(host) {
    const window = host.ownerDocument.defaultView;
    const style = window.getComputedStyle(host);
    const width =
        host.getBoundingClientRect().width -
        Number.parseFloat(style.paddingLeft || "0") -
        Number.parseFloat(style.paddingRight || "0");
    const compact = isCompactWidth(width);
    const drawer = window.matchMedia(
        `(max-width:${COMPOSER_DRAWER_BREAKPOINT}px)`,
    ).matches;
    const touch = drawer || window.matchMedia("(pointer:coarse)").matches;
    return Object.freeze({
        compact,
        layout: compact
            ? "compact"
            : width <= COMPOSER_MEDIUM_BREAKPOINT
              ? "medium"
              : "regular",
        drawer,
        touch,
    });
}

/** @param {HTMLElement} root Page root. @param {HTMLElement} host Element host. @param {object} presentation Current context. @returns {void} */
export function applyComposerPresentation(root, host, presentation) {
    host.dataset.composerLayout = presentation.layout;
    root.dataset.composerDrawer = String(presentation.drawer);
    root.dataset.composerTouch = String(presentation.touch);
}

/** @param {HTMLElement} root Page root. @param {HTMLElement} container Content host. @param {AbortSignal} signal Surface lifetime. @param {{observeResize?: boolean}} options Observe standalone surfaces; grid composers already observe their own size. @returns {() => void} Cleanup. */
export function watchComposerPresentation(
    root,
    container,
    signal,
    { observeResize = false } = {},
) {
    if (signal.aborted) return () => {};
    const window = container.ownerDocument.defaultView;
    const queries = [
        `(max-width:${COMPOSER_DRAWER_BREAKPOINT}px)`,
        "(pointer:coarse)",
    ].map((query) => window.matchMedia(query));
    const synchronize = () => {
        for (const host of [
            container,
            ...container.querySelectorAll("[data-composer-element]"),
        ])
            applyComposerPresentation(root, host, composerPresentation(host));
    };
    const dispose = () => {
        observer?.disconnect();
        for (const query of queries)
            query.removeEventListener("change", synchronize);
        signal.removeEventListener("abort", dispose);
    };
    const observer = observeResize
        ? new window.ResizeObserver(synchronize)
        : null;
    observer?.observe(container);
    for (const query of queries) query.addEventListener("change", synchronize);
    signal.addEventListener("abort", dispose, { once: true });
    synchronize();
    return dispose;
}
