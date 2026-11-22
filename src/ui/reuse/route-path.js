/**
 * Route-path helpers for same-origin URL normalization and current-route reads.
 *
 * Public exports:
 *   findMatchingRoute(routes, path) — match route patterns without query data.
 *   internalNavigationPath(href) — resolve an internal navigation link.
 *   getCurrentRoutePath() — returns the browser's current in-app route string
 *     including pathname, search, and hash.
 *   normalizeSameOriginRoutePath(routePath, options?) — normalizes a route/path
 *     string into a same-origin in-app route string or returns an empty string.
 *
 * Usage:
 *   import {
 *     getCurrentRoutePath,
 *     normalizeSameOriginRoutePath,
 *   } from './route-path.js';
 *
 *   const currentRoutePath = getCurrentRoutePath();
 *   const normalizedRoutePath = normalizeSameOriginRoutePath('/settings#security');
 *
 * @param {string} routePath
 * @param {{ logFailures?: boolean }} [options]
 * @returns {string}
 */

import { bindCapability } from "./capabilities.js";

const log = bindCapability("ui:log");

export function getCurrentRoutePath() {
    if (typeof window === "undefined" || !window.location) return "";
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function normalizeSameOriginRoutePath(
    routePath,
    { logFailures = false, baseUrl = globalThis.window?.location?.origin } = {},
) {
    if (typeof routePath !== "string" || !routePath.trim()) {
        return "";
    }
    if (typeof window === "undefined") {
        return "";
    }
    try {
        const routeUrl = new URL(routePath, baseUrl);
        if (
            routeUrl.origin !== window.location.origin ||
            !["http:", "https:"].includes(routeUrl.protocol) ||
            routeUrl.username ||
            routeUrl.password
        )
            return "";
        return `${routeUrl.pathname}${routeUrl.search}${routeUrl.hash}`;
    } catch (error) {
        if (logFailures) {
            void log("error", "route_path_normalization_failed", {
                component: "core",
                operation: "normalizeRoutePath",
                errorName: error?.name,
            });
        }
        return "";
    }
}

/** Match a declared route against a path without incidental query or fragment data.
 * @param {object[]} routes Available route descriptors.
 * @param {string} path Destination URL path.
 * @returns {object | undefined} Matching descriptor.
 */
export function findMatchingRoute(routes, path) {
    const cleanPath = String(path).split("?")[0].split("#")[0];
    return routes.find((route) => route.pattern.test(cleanPath));
}

/** Resolve an internal navigation link using the shared same-origin policy.
 * @param {string} href Link destination.
 * @returns {string | null} Allowed in-app path.
 */
export function internalNavigationPath(href) {
    if (!href || href.startsWith("#")) return null;
    return (
        normalizeSameOriginRoutePath(href, { baseUrl: window.location.href }) ||
        null
    );
}
