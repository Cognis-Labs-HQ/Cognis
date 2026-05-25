/**
 * Page-entry loading helpers for direct page mounts and SPA transitions.
 *
 * Public exports:
 *   beginPageLoading() — increments the global client-side page-loading counter
 *     and shows the loading overlay.
 *   endPageLoading() — decrements the global client-side page-loading counter
 *     and hides the loading overlay when all pending work is done.
 *   mountWhenDirect(mount, options) — runs a page mount on direct URL loads
 *     while skipping SPA-router navigations and automatically updates the
 *     loading overlay state around the mount.
 *
 * Usage example:
 *   import { mountWhenDirect } from '/static/reuse/page-entry.js';
 *   export async function mount(root) { ... }
 *   await mountWhenDirect(mount);
 */

function updatePageLoadingState() {
    const body = document.body;
    if (!body) return;
    const pendingLoadCount = Math.max(globalThis.__pageLoadingCount ?? 0, 0);
    if (pendingLoadCount > 0) {
        body.dataset.pageReady = "false";
        body.setAttribute("aria-busy", "true");
        return;
    }
    body.dataset.pageReady = "true";
    body.setAttribute("aria-busy", "false");
}

/**
 * Shows the shared page-loading overlay for a new client-side load task.
 *
 * @returns {void}
 */
export function beginPageLoading() {
    globalThis.__pageLoadingCount = (globalThis.__pageLoadingCount ?? 0) + 1;
    updatePageLoadingState();
}

/**
 * Hides the shared page-loading overlay once a client-side load task finishes.
 *
 * @returns {void}
 */
export function endPageLoading() {
    globalThis.__pageLoadingCount = Math.max(
        (globalThis.__pageLoadingCount ?? 1) - 1,
        0,
    );
    updatePageLoadingState();
}

/**
 * Runs a page mount on direct URL loads while skipping SPA-router navigations.
 *
 * @param {(root: Element | null) => Promise<unknown>} mount - Page mount
 *   function for the current entry module.
 * @param {{ rootSelector?: string }} [options] - Direct-mount options.
 * @returns {Promise<void>}
 */
export async function mountWhenDirect(mount, { rootSelector = "#app" } = {}) {
    if (globalThis.__spaRouter) return;
    beginPageLoading();
    try {
        await mount(document.querySelector(rootSelector));
    } finally {
        endPageLoading();
    }
}
