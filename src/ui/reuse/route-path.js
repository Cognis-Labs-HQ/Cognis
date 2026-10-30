/**
 * Route-path helpers for same-origin URL normalization and current-route reads.
 *
 * Public exports:
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

const log = (...messageParts) => console.error("[route-path]", ...messageParts);

export function getCurrentRoutePath() {
    if (typeof window === "undefined" || !window.location) return "";
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function normalizeSameOriginRoutePath(
    routePath,
    { logFailures = false } = {},
) {
    if (typeof routePath !== "string" || !routePath.trim()) {
        return "";
    }
    if (typeof window === "undefined") {
        return "";
    }
    try {
        const routeUrl = new URL(routePath, window.location.origin);
        if (routeUrl.origin !== window.location.origin) return "";
        return `${routeUrl.pathname}${routeUrl.search}${routeUrl.hash}`;
    } catch (error) {
        if (logFailures) {
            log("Failed to normalize route path.", routePath, error);
        }
        return "";
    }
}
