/**
 * Registers and renders links contributed to either side of the page footer.
 *
 * Public exports:
 *   createFooterLinkRegistry() — creates an isolated link contribution registry.
 *   isFooterLinkActive(href, pathname) — checks whether a link owns a route.
 *   footerLinks — shared registry published as the `ui:footerLinks` capability.
 *   mountFooterLinks(root, options) — binds the shared registry to a page shell.
 *   Registry instances expose withContexts() to scope contribution defaults.
 *
 * Usage:
 *   const footerLinks = uiCtx.capabilities.get('ui:footerLinks');
 *   const remove = footerLinks.add({ id: 'legal', side: 'right', href: '/terms-of-service', label: 'Terms', contexts: ['application'] });
 *   remove();
 *
 * @param {{ onChange?: () => void }} options
 * @returns {{ add: (descriptor: object) => (() => void), remove: (id: string) => boolean, list: (side?: 'left'|'right') => Array<object>, subscribe: (listener: () => void) => (() => void), withContexts: (contexts: string[], contribute: () => unknown) => Promise<unknown> }}
 */

import { uiCtx } from "./ui-ctx.js";

export function createFooterLinkRegistry({ onChange } = {}) {
    const links = new Map();
    const listeners = new Set(onChange ? [onChange] : []);
    let contributionContexts = null;

    function notify() {
        listeners.forEach((listener) => listener());
    }

    function add(descriptor) {
        const id = String(descriptor?.id ?? "").trim();
        const href = String(descriptor?.href ?? "").trim();
        const side = descriptor?.side ?? "left";
        const label = String(descriptor?.label ?? "").trim();
        const labelKey = String(descriptor?.labelKey ?? "").trim();
        if (!id || !href || (!label && !labelKey)) {
            throw new Error(
                "Footer links require id, href, and label or labelKey.",
            );
        }
        if (side !== "left" && side !== "right") {
            throw new Error('Footer link side must be "left" or "right".');
        }
        if (links.has(id))
            throw new Error(`Footer link "${id}" already exists.`);
        const contexts = Array.isArray(descriptor?.contexts)
            ? [
                  ...new Set(
                      descriptor.contexts
                          .map(String)
                          .map((value) => value.trim())
                          .filter(Boolean),
                  ),
              ]
            : (contributionContexts ?? ["application"]);
        if (contexts.length === 0) {
            throw new Error("Footer links require at least one context.");
        }
        const link = Object.freeze({
            id,
            href,
            side,
            label,
            labelKey,
            contexts: Object.freeze(contexts),
        });
        links.set(id, link);
        notify();
        return () => {
            if (links.get(id) !== link) return;
            links.delete(id);
            notify();
        };
    }

    function remove(id) {
        const normalizedId = String(id ?? "").trim();
        const existing = links.get(normalizedId);
        if (!existing) return false;
        if (!contributionContexts) {
            links.delete(normalizedId);
            notify();
            return true;
        }
        const remainingContexts = existing.contexts.filter(
            (context) => !contributionContexts.includes(context),
        );
        if (remainingContexts.length === existing.contexts.length) return false;
        if (remainingContexts.length === 0) {
            links.delete(normalizedId);
        } else {
            links.set(
                normalizedId,
                Object.freeze({
                    ...existing,
                    contexts: Object.freeze(remainingContexts),
                }),
            );
        }
        notify();
        return true;
    }

    function list(side) {
        const values = Array.from(links.values());
        return side ? values.filter((link) => link.side === side) : values;
    }

    function subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }

    /**
     * Applies default rendering contexts to contributions made by a plugin.
     *
     * @param {string[]} contexts Rendering contexts owned by the caller.
     * @param {() => unknown} contribute Loads or invokes the contributor.
     * @returns {Promise<unknown>} The contributor result.
     */
    async function withContexts(contexts, contribute) {
        if (typeof contribute !== "function") {
            throw new Error("Footer context contribution requires a function.");
        }
        const normalizedContexts = [
            ...new Set(
                (Array.isArray(contexts) ? contexts : [])
                    .map(String)
                    .map((value) => value.trim())
                    .filter(Boolean),
            ),
        ];
        if (normalizedContexts.length === 0) {
            throw new Error(
                "Footer contributions require at least one context.",
            );
        }
        const previousContexts = contributionContexts;
        contributionContexts = normalizedContexts;
        try {
            return await contribute();
        } finally {
            contributionContexts = previousContexts;
        }
    }

    return { add, remove, list, subscribe, withContexts };
}

export const footerLinks = createFooterLinkRegistry();
uiCtx.capabilities.contribute("ui:footerLinks", footerLinks);
const mountedShells = new WeakMap();

/**
 * Reports whether a footer link matches the current route or a descendant.
 *
 * @param {string} href - Footer link URL.
 * @param {string} pathname - Route pathname to compare.
 * @returns {boolean} Whether the link represents the route.
 */
export function isFooterLinkActive(href, pathname = window.location.pathname) {
    const linkPath = new URL(href, window.location.origin).pathname;
    return pathname === linkPath || pathname.startsWith(`${linkPath}/`);
}

/**
 * Renders current footer link contributions and keeps them synchronized.
 *
 * @param {HTMLElement} root
 * @param {{ i18n?: { t: (key: string) => string }, context?: string }} options
 * @returns {() => void} Stops synchronization for this shell.
 */
export function mountFooterLinks(root, { i18n, context = "application" } = {}) {
    if (!root) return () => undefined;
    mountedShells.get(root)?.();
    function render() {
        for (const side of ["left", "right"]) {
            const container = root.querySelector(
                `[data-footer-links="${side}"]`,
            );
            if (!container) continue;
            container.replaceChildren(
                ...footerLinks
                    .list(side)
                    .filter((descriptor) =>
                        descriptor.contexts.includes(context),
                    )
                    .map((descriptor) => {
                        const link = document.createElement("a");
                        link.className = "global-footer-link";
                        link.href = descriptor.href;
                        link.dataset.footerLink = descriptor.id;
                        const isActive = isFooterLinkActive(descriptor.href);
                        link.classList.toggle("active", isActive);
                        if (isActive) link.setAttribute("aria-current", "page");
                        link.textContent = descriptor.labelKey
                            ? (i18n?.t(descriptor.labelKey) ??
                              descriptor.labelKey)
                            : descriptor.label;
                        return link;
                    }),
            );
        }
    }

    render();
    const unsubscribe = footerLinks.subscribe(render);
    window.addEventListener("popstate", render);
    window.addEventListener("cognis:route-will-change", render);
    const unmount = () => {
        unsubscribe();
        window.removeEventListener("popstate", render);
        window.removeEventListener("cognis:route-will-change", render);
        mountedShells.delete(root);
    };
    mountedShells.set(root, unmount);
    return () => {
        unmount();
    };
}
