/**
 * Loads every active host browser capability provider before dependent UI mounts.
 *
 * Public exports:
 * - `ensureUiProvidersLoaded()` — fetches and imports all active provider scripts once.
 * - `invalidateUiProviders()` — clears readiness so changed lifecycle state is reloaded.
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

/**
 * Loads active provider scripts and resolves only when their capabilities exist.
 *
 * @returns {Promise<void>}
 */
export async function ensureUiProvidersLoaded() {
    if (providersLoaded) return;
    if (providersLoadPromise) return providersLoadPromise;
    if (
        typeof localStorage === "undefined" ||
        !localStorage.getItem("cognis_access_token")
    )
        return;
    providersLoadPromise = (async () => {
        const response = await apiFetch("/api/v1/ui/capability-providers");
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
        providersLoaded = true;
    })().finally(() => {
        providersLoadPromise = null;
    });
    return providersLoadPromise;
}

/**
 * Invalidates provider readiness after component lifecycle changes.
 *
 * @returns {void}
 */
export function invalidateUiProviders() {
    providersLoaded = false;
}

uiCtx.capabilities.contribute(
    "ui:ensureNavbarPluginsLoaded",
    ensureUiProvidersLoaded,
);
