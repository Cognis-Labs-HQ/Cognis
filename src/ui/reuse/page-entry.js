/**
 * Page-entry loading helpers for direct page mounts and SPA transitions.
 *
 * Public exports:
 *   beginPageLoading() — starts a tracked client-side page-loading task and
 *     returns an idempotent cleanup function that hides the overlay when the
 *     task is released.
 *   mountWhenDirect(mount, options) — runs a page mount on direct URL loads
 *     while skipping SPA-router navigations and automatically updates the
 *     loading overlay state around the mount.
 *
 * Usage example:
 *   import { mountWhenDirect } from '/static/reuse/page-entry.js';
 *   export async function mount(root) { ... }
 *   await mountWhenDirect(mount);
 */

const activePageLoadingTokens = new Set();
let nextPageLoadingToken = 0;

function updatePageLoadingState() {
    const body = document.body;
    if (!body) return;
    const pendingLoadCount = activePageLoadingTokens.size;
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
 * @returns {() => void}
 */
export function beginPageLoading() {
    const token = nextPageLoadingToken++;
    let released = false;
    activePageLoadingTokens.add(token);
    updatePageLoadingState();
    return () => {
        if (released) return;
        released = true;
        endPageLoading(token);
    };
}

/**
 * Hides the shared page-loading overlay once a client-side load task finishes.
 *
 * @param {number} token - Loading token returned by beginPageLoading().
 * @returns {void}
 */
function endPageLoading(token) {
    activePageLoadingTokens.delete(token);
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
    const finishPageLoading = beginPageLoading();
    try {
        await mount(document.querySelector(rootSelector));
    } finally {
        finishPageLoading();
    }
}
