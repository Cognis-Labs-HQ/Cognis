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
 *   preparePageStylesheets(hrefs) — loads a route's complete stylesheet set
 *                                and returns a commit callback that removes
 *                                prior-route styles after the new page mounts.
 *                                Module-owned styles load in a lower cascade
 *                                layer so they cannot override host shell rules.
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
const _initialPageStylesheets = new Set(
    [...document.head.querySelectorAll('link[rel="stylesheet"][href]')].map(
        (link) => new URL(link.href, window.location.origin).pathname,
    ),
);
const _managedPageStylesheets = new Set(_initialPageStylesheets);
const MODULE_STYLESHEET_PREFIX = "/static/modules/";

function isModuleStylesheet(href) {
    return new URL(href, window.location.origin).pathname.startsWith(
        MODULE_STYLESHEET_PREFIX,
    );
}

function ensureLayeredModuleStylesheet(href) {
    const existing = [
        ...document.head.querySelectorAll("style[data-module-stylesheet]"),
    ].find((style) => style.dataset.moduleStylesheet === href);
    if (existing) return Promise.resolve();

    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "style";
    preload.href = href;
    const ready = new Promise((resolve) => {
        const finish = () => {
            const style = document.createElement("style");
            style.dataset.moduleStylesheet = href;
            style.textContent = `@import url(${JSON.stringify(href)}) layer(cognis-module-route);`;
            document.head.append(style);
            for (const link of document.head.querySelectorAll(
                'link[rel="stylesheet"][href]',
            )) {
                if (
                    new URL(link.href, window.location.origin).pathname ===
                    new URL(href, window.location.origin).pathname
                ) {
                    link.remove();
                }
            }
            preload.remove();
            resolve();
        };
        preload.addEventListener("load", finish, { once: true });
        preload.addEventListener(
            "error",
            (error) => {
                console.error(
                    "[page-styles] failed to preload module stylesheet:",
                    href,
                    error,
                );
                finish();
            },
            { once: true },
        );
    });
    document.head.append(preload);
    return ready;
}

export function ensurePageStylesheet(href) {
    if (_pending.has(href)) return _pending.get(href);

    if (isModuleStylesheet(href)) {
        const ready = ensureLayeredModuleStylesheet(href);
        _pending.set(href, ready);
        return ready;
    }

    const existing = document.head.querySelector(
        `link[rel="stylesheet"][href="${href}"]`,
    );
    if (existing) {
        const ready = existing.sheet
            ? Promise.resolve()
            : new Promise((resolve) =>
                  existing.addEventListener("load", resolve, { once: true }),
              );
        _pending.set(href, ready);
        return ready;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
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
    _pending.set(href, ready);
    return ready;
}

/**
 * Reconciles document styles with the destination route's declared bundle.
 *
 * @param {string[]} hrefs - Complete stylesheet URLs declared by the route.
 * @returns {Promise<() => void>} Resolves after destination styles load with a callback that removes stale route styles.
 */
export async function preparePageStylesheets(hrefs) {
    const destinationStylesheets = new Set(
        hrefs.map((href) => new URL(href, window.location.origin).pathname),
    );
    destinationStylesheets.forEach((href) => _managedPageStylesheets.add(href));
    await Promise.all(hrefs.map(ensurePageStylesheet));
    return () => {
        for (const staleStylesheet of _managedPageStylesheets) {
            if (destinationStylesheets.has(staleStylesheet)) continue;
            for (const link of document.head.querySelectorAll(
                'link[rel="stylesheet"][href]',
            )) {
                if (
                    new URL(link.href, window.location.origin).pathname ===
                    staleStylesheet
                ) {
                    link.remove();
                }
            }
            for (const style of document.head.querySelectorAll(
                "style[data-module-stylesheet]",
            )) {
                if (
                    new URL(
                        style.dataset.moduleStylesheet,
                        window.location.origin,
                    ).pathname === staleStylesheet
                ) {
                    style.remove();
                }
            }
            _pending.delete(staleStylesheet);
        }
    };
}
