/**
 * Search indexing helpers for converting UI-owned content into searchable text
 * and safe `data-search-*` attributes.
 *
 * Public exports:
 *   htmlToSearchText(value) — converts rendered HTML into normalized text.
 *   renderSearchDataAttributes(attributes) — renders escaped HTML attributes.
 *
 * Example:
 *   const text = htmlToSearchText('<h2>Settings</h2><p>Theme</p>');
 *   const attrs = renderSearchDataAttributes({ 'data-search-text': text });
 *
 * @module reuse/search-index
 */

import { escapeHtml } from "./escape-html.js";

/**
 * Converts rendered HTML or plain text into normalized text suitable for
 * full-text search matching.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function htmlToSearchText(value) {
    return String(value ?? "")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Renders escaped HTML attributes for search metadata.
 *
 * @param {Record<string, unknown>} attributes
 * @returns {string}
 */
export function renderSearchDataAttributes(attributes) {
    return Object.entries(attributes)
        .map(([name, value]) => `${name}="${escapeHtml(String(value ?? ""))}"`)
        .join(" ");
}
