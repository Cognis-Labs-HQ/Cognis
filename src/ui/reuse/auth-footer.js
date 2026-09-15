/**
 * Loads module-owned authentication footer integrations and renders their
 * neutral link strip on login and registration pages.
 *
 * Public exports:
 *   loadAuthFooterPlugins() — imports enabled auth footer contributors.
 *   renderAuthFooter() — returns the shared footer-link mount points.
 *   mountAuthFooter(root, options) — binds contributed links to the strip.
 *
 * Usage:
 *   await loadAuthFooterPlugins();
 *   container.innerHTML = renderAuthFooter();
 *   mountAuthFooter(container, { i18n, signal });
 *
 * @returns {Promise<void>} Resolves after every enabled contributor loads.
 */

import { apiFetch } from "./api-client.js";
import { mountFooterLinks } from "./footer-links.js";

export async function loadAuthFooterPlugins() {
    const response = await apiFetch("/api/v1/ui/auth-footer-plugins");
    if (!response.ok) throw new Error("auth_footer_plugins_unavailable");
    const payload = await response.json();
    await Promise.all(
        (Array.isArray(payload?.data) ? payload.data : []).map(
            (plugin) => import(String(plugin.scriptUrl)),
        ),
    );
}

export function renderAuthFooter() {
    return `<nav class="auth-footer" aria-label="Footer"><span data-footer-links="left"></span><span data-footer-links="right"></span></nav>`;
}

/**
 * @param {HTMLElement} root Authentication page root.
 * @param {{ i18n?: object, signal?: AbortSignal }} options Render context.
 * @returns {() => void} Removes registry and navigation listeners.
 */
export function mountAuthFooter(root, { i18n, signal } = {}) {
    const unmount = mountFooterLinks(root, { i18n });
    signal?.addEventListener("abort", unmount, { once: true });
    return unmount;
}
