/**
 * Registry of available page elements for dashboard and page-builder views.
 * Re-exports the element catalog from config/pages.js and provides look-up and
 * config-merge helpers used by any page that renders customisable element grids.
 *
 * Public exports:
 *   getElementDefinition(elementId) — returns the element definition for the given id, or undefined.
 *   mergeElementConfig(elementId, overrides) — merges overrides onto the element's defaultConfig.
 *   getElementLibrary() — returns a snapshot of all registered element definitions.
 *
 * @example
 * ```js
 * import { mergeElementConfig, getElementLibrary } from '../reuse/element-registry.js';
 * const allElements = getElementLibrary();
 * const config = mergeElementConfig('activity-feed', { itemLimit: 10 });
 * ```
 *
 * @param {string} elementId — the element's unique id string.
 * @returns {object|undefined} The element definition, or undefined if not found.
 */

import { PAGE_ELEMENT_LIBRARY } from "../config/pages.js";

const map = new Map(
    PAGE_ELEMENT_LIBRARY.map((element) => [element.id, element]),
);

export function getElementDefinition(elementId) {
    return map.get(elementId);
}

export function mergeElementConfig(elementId, overrides = {}) {
    const definition = getElementDefinition(elementId);
    return { ...(definition?.defaultConfig ?? {}), ...overrides };
}

export function getElementLibrary() {
    return [...map.values()];
}
