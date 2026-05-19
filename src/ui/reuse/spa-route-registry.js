/**
 * Loads and caches dynamic SPA route descriptors from the UI API so the app
 * router can discover gateway/adapter-provided pages without hardcoding their
 * paths in core routing tables.
 *
 * Public exports:
 * - `loadSpaRoutes()` Fetches `/api/v1/ui/app-routes` and returns normalized route records.
 * - `clearSpaRouteCache()` Clears the in-memory route cache.
 *
 * @example
 * ```js
 * import { loadSpaRoutes } from '/static/reuse/spa-route-registry.js';
 * const routes = await loadSpaRoutes();
 * ```
 */

import { apiFetch } from "./api-client.js";

let cachedSpaRoutes = null;
let activeLoadPromise = null;

function normalizeRoute(rawRoute) {
    const patternSource = String(rawRoute?.pattern ?? "").trim();
    const basePath = String(rawRoute?.base ?? "").trim();
    const scriptUrl = String(rawRoute?.scriptUrl ?? "").trim();
    const stylesheets = Array.isArray(rawRoute?.stylesheets)
        ? rawRoute.stylesheets
              .map((stylesheetUrl) => String(stylesheetUrl ?? "").trim())
              .filter(Boolean)
        : [];
    if (!patternSource || !basePath || !scriptUrl) {
        return null;
    }
    try {
        const routePattern = new RegExp(patternSource);
        return {
            pattern: routePattern,
            base: basePath,
            stylesheets,
            load: async () => import(scriptUrl),
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        console.warn(
            "[spa-route-registry] Ignoring invalid SPA route descriptor.",
            {
                routeId: rawRoute?.id,
                pattern: patternSource,
                scriptUrl,
                error: errorMessage,
            },
        );
        return null;
    }
}

/**
 * Fetches SPA routes from the API and returns normalized route entries that
 * the app router can consume directly.
 *
 * @returns {Promise<Array<{pattern: RegExp, base: string, stylesheets: string[], load: (path?: string) => Promise<unknown>}>>}
 */
export async function loadSpaRoutes() {
    if (cachedSpaRoutes) {
        return cachedSpaRoutes;
    }
    if (activeLoadPromise) {
        return activeLoadPromise;
    }
    activeLoadPromise = (async () => {
        try {
            const response = await apiFetch("/api/v1/ui/app-routes");
            if (!response.ok) {
                cachedSpaRoutes = [];
                return cachedSpaRoutes;
            }
            const payload = await response.json();
            const normalizedRoutes = Array.isArray(payload?.data)
                ? payload.data.map(normalizeRoute).filter(Boolean)
                : [];
            cachedSpaRoutes = normalizedRoutes;
            return normalizedRoutes;
        } catch {
            cachedSpaRoutes = [];
            return cachedSpaRoutes;
        } finally {
            activeLoadPromise = null;
        }
    })();
    return activeLoadPromise;
}

/**
 * Clears cached SPA route descriptors so the next `loadSpaRoutes()` call
 * refreshes route metadata from the server.
 *
 * @returns {void}
 */
export function clearSpaRouteCache() {
    cachedSpaRoutes = null;
    activeLoadPromise = null;
}
