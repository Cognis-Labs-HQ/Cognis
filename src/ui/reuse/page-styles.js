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

export function ensurePageStylesheet(href) {
    if (_pending.has(href)) return _pending.get(href);

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
