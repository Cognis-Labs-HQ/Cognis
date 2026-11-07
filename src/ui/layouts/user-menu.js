/**
 * Keeps provider-contributed entries in the shell-owned user menu canonical.
 *
 * Exports:
 * - `reconcileUserMenuEntries` removes duplicate link destinations.
 * - `bindUserMenuIntegrity` continuously reconciles provider contributions.
 * - `bindAccountMenu` owns account menu activation, dismissal and transient lifetime.
 *
 * @example
 * bindUserMenuIntegrity(document.querySelector("#profile-dropdown"));
 */

import { uiCtx } from "../reuse/ui-ctx.js";
import { transientSurfaces } from "../reuse/transient-surfaces.js";

/**
 * Removes all but the first menu entry for each link destination.
 *
 * @param {HTMLElement} dropdown
 * @returns {number} Number of duplicate entries removed.
 */
export function reconcileUserMenuEntries(dropdown) {
    const seenHrefs = new Set();
    let removed = 0;
    for (const item of Array.from(dropdown.children)) {
        const link = item.querySelector?.("a[href]");
        const href = String(link?.getAttribute("href") ?? "").trim();
        if (!href) continue;
        if (!seenHrefs.has(href)) {
            seenHrefs.add(href);
            continue;
        }
        console.warn("[dashboard-layout]:duplicate-user-menu-entry-removed", {
            href,
        });
        item.remove();
        removed += 1;
    }
    return removed;
}

/**
 * Watches the shell-owned menu for asynchronous provider contributions.
 *
 * @param {HTMLElement} dropdown
 * @returns {void}
 */
export function bindUserMenuIntegrity(dropdown) {
    reconcileUserMenuEntries(dropdown);
    if (dropdown.dataset.integrityBound === "true") return;
    dropdown.dataset.integrityBound = "true";
    const observer = new MutationObserver(() => {
        reconcileUserMenuEntries(dropdown);
    });
    observer.observe(dropdown, { childList: true });
}

/** @param {object} options Toggle, dropdown, menu root and optional owner signal. @returns {Function} Listener and surface cleanup. */
export function bindAccountMenu({ toggle, dropdown, menu, signal }) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const scoped = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;
    let menuController;
    const close = () => {
        menuController?.abort();
        dropdown.classList.add("hidden");
        menu.classList.remove("open");
        toggle.classList.remove("active");
        toggle.setAttribute("aria-expanded", "false");
    };
    const open = () => {
        if (
            !menuController ||
            menuController.signal.aborted ||
            dropdown.classList.contains("hidden")
        ) {
            menuController?.abort();
            menuController = new AbortController();
            transientSurfaces.register(dropdown, close, menuController.signal);
        }
        dropdown.classList.remove("hidden");
        menu.classList.add("open");
        toggle.classList.add("active");
        toggle.setAttribute("aria-expanded", "true");
    };
    const hookId = `ui:accountMenu:${crypto.randomUUID()}`;
    uiCtx.extendFlow("ui:tutorial:start", "validate", { id: hookId }, close);
    scoped.addEventListener(
        "abort",
        () => uiCtx.removeFlowHook("ui:tutorial:start", "validate", hookId),
        { once: true },
    );
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("mouseenter", open, { signal: scoped });
    toggle.addEventListener(
        "click",
        (event) => {
            event.stopPropagation();
            open();
        },
        { signal: scoped },
    );
    dropdown.ownerDocument.addEventListener(
        "click",
        (event) => {
            if (!menu.contains(event.target)) close();
        },
        { signal: scoped },
    );
    scoped.addEventListener("abort", close, { once: true });
    if (!signal) {
        const observer =
            new dropdown.ownerDocument.defaultView.MutationObserver(() => {
                if (!dropdown.isConnected) controller.abort();
            });
        observer.observe(dropdown.ownerDocument.documentElement, {
            childList: true,
            subtree: true,
        });
        scoped.addEventListener("abort", () => observer.disconnect(), {
            once: true,
        });
    }
    return () => controller.abort();
}
