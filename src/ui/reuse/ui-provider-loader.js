/**
 * Loads every active host browser capability provider before dependent UI mounts.
 *
 * Public exports:
 * - `ensureUiProvidersLoaded()` — imports capability providers before page mounts.
 * - `ensureNavbarPluginsLoaded()` — imports navbar plugins after shell rendering.
 * - `invalidateUiProviders()` — clears readiness so changed lifecycle state is reloaded.
 * - `invalidateNavbarPlugins()` — clears navbar readiness after lifecycle changes.
 *
 * @example
 * ```js
 * import { ensureUiProvidersLoaded } from '/static/reuse/ui-provider-loader.js';
 * await ensureUiProvidersLoaded();
 * const files = uiCtx.capabilities.get('files:uiClient');
 * ```
 */

import { apiFetch } from "./api-client.js";
import { uiCtx } from "./ui-ctx.js";

let providersLoaded = false;
let providersLoadPromise = null;
let navbarPluginsLoaded = false;
let navbarPluginsLoadPromise = null;

async function importCatalog(endpoint) {
    const response = await apiFetch(endpoint);
    if (response.status === 401) return false;
    if (!response.ok) {
        throw new Error(
            `UI provider discovery failed with HTTP ${response.status}`,
        );
    }
    const payload = await response.json();
    const providers = Array.isArray(payload.data) ? payload.data : [];
    await Promise.all(
        providers.map((provider) =>
            provider?.scriptUrl ? import(provider.scriptUrl) : null,
        ),
    );
    return true;
}

/**
 * Loads active provider scripts and resolves only when their capabilities exist.
 *
 * @returns {Promise<void>}
 */
export async function ensureUiProvidersLoaded() {
    if (providersLoaded) return;
    if (providersLoadPromise) return providersLoadPromise;
    if (typeof localStorage === "undefined") return;
    providersLoadPromise = (async () => {
        providersLoaded = await importCatalog(
            "/api/v1/ui/capability-providers",
        );
    })().finally(() => {
        providersLoadPromise = null;
    });
    return providersLoadPromise;
}

/**
 * Loads navbar behavior after the dashboard shell has rendered its targets.
 *
 * @returns {Promise<void>}
 */
export async function ensureNavbarPluginsLoaded() {
    if (navbarPluginsLoaded) return;
    if (navbarPluginsLoadPromise) return navbarPluginsLoadPromise;
    if (typeof localStorage === "undefined") return;
    navbarPluginsLoadPromise = (async () => {
        navbarPluginsLoaded = await importCatalog("/api/v1/ui/navbar-plugins");
    })().finally(() => {
        navbarPluginsLoadPromise = null;
    });
    return navbarPluginsLoadPromise;
}

/**
 * Invalidates provider readiness after component lifecycle changes.
 *
 * @returns {void}
 */
export function invalidateUiProviders() {
    providersLoaded = false;
}

/**
 * Invalidates navbar readiness after component lifecycle changes.
 *
 * @returns {void}
 */
export function invalidateNavbarPlugins() {
    navbarPluginsLoaded = false;
}

uiCtx.capabilities.contribute(
    "ui:ensureNavbarPluginsLoaded",
    ensureNavbarPluginsLoaded,
);
