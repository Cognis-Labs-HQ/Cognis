/**
 * Idempotent stylesheet injection for SPA page navigation.
 *
 * When the client-side router loads a new page it must ensure all
 * CSS required by that page is present in <head> before mount() is
 * called. This module provides a single utility for that purpose.
 *
 * Public exports:
 *   ensurePageStylesheet(href) — injects a <link rel="stylesheet"> for
 *                                href if not already present, and returns
 *                                a Promise that resolves once the sheet is
 *                                ready (load event) or has already loaded.
 *                                If the sheet fails to load (network error,
 *                                404, etc.) the promise still resolves rather
 *                                than rejecting, so that a stylesheet failure
 *                                never prevents the page from mounting. The
 *                                error is logged to console.error.
 *   ensurePersistentStylesheet(href) — compatibility alias for loading a
 *                                stylesheet retained by the dashboard shell.
 *   preparePageStylesheets(hrefs) — loads a route's stylesheet set. Loaded
 *                                styles remain available for the lifetime of
 *                                the shell so persistent component windows do
 *                                not lose dependencies during navigation.
 *
 * Usage:
 *   import { ensurePageStylesheet } from '../reuse/page-styles.js';
 *   await Promise.all([
 *     ensurePageStylesheet('/static/styles/profile.css'),
 *     ensurePageStylesheet('/static/styles/reuse/char-counter.css'),
 *   ]);
 *
 * @param {string} href — absolute URL of the stylesheet to inject.
 * @returns {Promise<void>} resolves when the stylesheet is ready.
 */

const _pending = new Map();

function stylesheetPathname(href) {
    return new URL(href, window.location.origin).pathname;
}

export function ensurePageStylesheet(href) {
    const pathname = stylesheetPathname(href);
    if (_pending.has(pathname)) return _pending.get(pathname);

    const existing = [
        ...document.head.querySelectorAll('link[rel="stylesheet"][href]'),
    ].find((link) => stylesheetPathname(link.href) === pathname);
    if (existing) {
        const ready = existing.sheet
            ? Promise.resolve()
            : new Promise((resolve) =>
                  existing.addEventListener("load", resolve, { once: true }),
              );
        _pending.set(pathname, ready);
        return ready;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.pageStylesheet = "true";
    const ready = new Promise((resolve) => {
        link.addEventListener("load", resolve, { once: true });
        link.addEventListener("error", (err) => {
            console.error(
                "[page-styles] failed to load stylesheet:",
                href,
                err,
            );
            resolve();
        });
    });
    document.head.appendChild(link);
    _pending.set(pathname, ready);
    return ready;
}

/**
 * Ensures a dashboard-shell stylesheet remains active across SPA navigation.
 *
 * @param {string} href - Absolute stylesheet URL to load and retain.
 * @returns {Promise<void>} Resolves when the stylesheet is ready.
 */
export function ensurePersistentStylesheet(href) {
    return ensurePageStylesheet(href);
}

/**
 * Loads the destination route's declared bundle without unloading prior CSS.
 *
 * @param {string[]} hrefs - Complete stylesheet URLs declared by the route.
 * @returns {Promise<() => void>} Resolves after destination styles load with a compatibility no-op callback.
 */
export async function preparePageStylesheets(hrefs) {
    await Promise.all(hrefs.map(ensurePageStylesheet));
    return () => {};
}
