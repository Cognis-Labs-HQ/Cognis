/**
 * Loads and caches dynamic SPA route descriptors from the UI API so the app
 * router can discover gateway/adapter-provided pages without hardcoding their
 * paths in core routing tables.
 *
 * Public exports:
 * - `loadSpaRoutes()` Fetches `/api/v1/ui/app-routes` and returns normalized route records.
 * - `clearSpaRouteCache()` Clears the in-memory route cache.
 * - `resolveComponentPage()` Resolves an explicitly embeddable page by owner UUID and route ID.
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
    const capabilityScripts = Array.isArray(rawRoute?.capabilityScripts)
        ? rawRoute.capabilityScripts
              .map((script) => String(script ?? "").trim())
              .filter(Boolean)
        : [];
    if (!patternSource || !basePath || !scriptUrl) {
        return null;
    }
    try {
        const routePattern = new RegExp(patternSource);
        return {
            id: String(rawRoute.id ?? "").trim(),
            ownerUuid: String(rawRoute.ownerUuid ?? "")
                .trim()
                .toLowerCase(),
            componentPage: rawRoute.componentPage ?? null,
            pattern: routePattern,
            base: basePath,
            stylesheets,
            load: async () => {
                await Promise.all(
                    capabilityScripts.map(
                        (providerScript) => import(providerScript),
                    ),
                );
                return import(scriptUrl);
            },
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
 * Resolves an enabled page that explicitly permits component-to-component use.
 *
 * @param {{componentUuid: string, routeId: string, mode?: string}} request - Immutable owner UUID, route ID, and optional presentation mode.
 * @returns {Promise<object | null>} The loadable SPA route, or null when unavailable/ineligible.
 */
export async function resolveComponentPage({ componentUuid, routeId, mode }) {
    const normalizedUuid = String(componentUuid ?? "")
        .trim()
        .toLowerCase();
    const normalizedRouteId = String(routeId ?? "").trim();
    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
            normalizedUuid,
        ) ||
        !/^[a-z0-9][a-z0-9._:-]{0,127}$/.test(normalizedRouteId)
    ) {
        return null;
    }
    return (
        (await loadSpaRoutes()).find(
            (route) =>
                route.id === normalizedRouteId &&
                route.ownerUuid === normalizedUuid &&
                route.componentPage &&
                (!mode || route.componentPage.modes?.includes(mode)),
        ) ?? null
    );
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
