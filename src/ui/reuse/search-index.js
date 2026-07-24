/**
 * Search indexing helpers for converting UI-owned content into searchable text
 * and safe `data-search-*` attributes.
 *
 * Public exports:
 *   htmlToSearchText(value) — converts rendered HTML into normalized text.
 *   htmlToSearchEntries(value) — extracts typed block-level search entries.
 *   htmlToSearchSegments(value) — extracts block-level text search results.
 *   createUserContentSearchItem(options) — normalizes user-owned search content.
 *   renderSearchDataAttributes(attributes) — renders escaped HTML attributes.
 *   highlightSearchTarget(target) — scrolls to and highlights a search target.
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
    const html = String(value ?? "");
    if (typeof document !== "undefined") {
        const template = document.createElement("template");
        template.innerHTML = html;
        template.content
            .querySelectorAll("script, style")
            .forEach((node) => node.remove());
        return String(template.content.textContent ?? "")
            .replace(/\s+/g, " ")
            .trim();
    }
    return html.replace(/\s+/g, " ").trim();
}

function readSearchAttribute(attributes, name) {
    const pattern = new RegExp(`${name}=["']([^"']*)["']`, "i");
    const match = pattern.exec(attributes);
    return match ? htmlToSearchText(match[1]) : "";
}

function resultClassForTag(tagName) {
    if (/^h[1-6]$/i.test(tagName)) return "heading";
    if (/^(button|summary|option)$/i.test(tagName)) return "operation";
    if (/^(label|td|th)$/i.test(tagName)) return "field";
    return "text";
}

/**
 * Extracts block-level search entries from rendered HTML with coarse result
 * classes so pages can surface headings, text, fields, and operations as
 * separate result types.
 *
 * @param {unknown} value
 * @returns {{ text: string, resultClass: string }[]}
 */
export function htmlToSearchEntries(value) {
    const html = String(value ?? "");
    const entries = [];
    const seen = new Set();
    const blockPattern =
        /<(h[1-6]|p|label|button|summary|option|li|td|th)([^>]*)>([\s\S]*?)<\/\1>/gi;
    for (const match of html.matchAll(blockPattern)) {
        const attributes = match[2] ?? "";
        const text =
            readSearchAttribute(attributes, "data-search-label") ||
            readSearchAttribute(attributes, "data-search-text") ||
            htmlToSearchText(match[3]);
        const resultClass =
            readSearchAttribute(attributes, "data-search-result-class") ||
            resultClassForTag(match[1]);
        const searchId =
            readSearchAttribute(attributes, "data-search-id") ||
            readSearchAttribute(attributes, "data-search-anchor");
        const key = `${resultClass}:${searchId}:${text}`;
        if (text && !seen.has(key)) {
            seen.add(key);
            entries.push({ text, resultClass, searchId });
        }
    }
    if (entries.length === 0) {
        const text = htmlToSearchText(html);
        if (text) entries.push({ text, resultClass: "text" });
    }
    return entries;
}

/**
 * Extracts block-level text segments from rendered HTML so descriptions and
 * controls can become individual search results instead of hidden body text.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function htmlToSearchSegments(value) {
    return htmlToSearchEntries(value).map((entry) => entry.text);
}

function escapeSearchSelector(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(value);
    }
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function resolveSearchTargetElement(target) {
    if (typeof document === "undefined") return null;
    const fallbackHash =
        typeof window === "undefined" ? "" : window.location.hash;
    const rawTarget = String(target ?? fallbackHash ?? "").trim();
    const hashTarget = rawTarget.includes("#")
        ? rawTarget.slice(rawTarget.indexOf("#") + 1)
        : rawTarget.replace(/^#/, "");
    if (!hashTarget) return null;
    const decodedTarget = decodeURIComponent(hashTarget);
    const escapedTarget = escapeSearchSelector(decodedTarget);
    return (
        document.getElementById(decodedTarget) ||
        document.querySelector(
            `[data-search-id="${escapedTarget}"], [data-search-anchor="${escapedTarget}"]`,
        )
    );
}

/**
 * Scrolls to and temporarily highlights the element referenced by a search
 * result URL/hash.
 *
 * @param {string|{ url?: string, id?: string }} target
 * @returns {boolean}
 */
export function highlightSearchTarget(target = undefined) {
    const fallbackHash =
        typeof window === "undefined" ? "" : window.location.hash;
    const targetValue =
        typeof target === "object" && target
            ? target.url || target.id || fallbackHash
            : target || fallbackHash;
    const element = resolveSearchTargetElement(targetValue);
    if (!element) return false;
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    element.classList.add("search-target-highlight");
    const timer = typeof window === "undefined" ? globalThis : window;
    timer.setTimeout(() => {
        element.classList.remove("search-target-highlight");
    }, 1800);
    return true;
}

/**
 * Builds a standard result for user-generated content while keeping ownership,
 * timestamp, route, and searchable body text in a consistent shape across
 * gateway and module indexes.
 *
 * @param {{ id: string, label: string, url: string, content?: string, author?: string, timestamp?: string, context?: string, resultClass?: string, category?: string }} options
 * @returns {{ id: string, label: string, description: string, url: string, resultClass: string, category: string, searchText: string, visible: boolean }}
 */
export function createUserContentSearchItem(options = {}) {
    const id = String(options.id ?? "").trim();
    const label = String(options.label ?? id).trim();
    const url = String(options.url ?? "").trim();
    const description = [options.context, options.author, options.timestamp]
        .filter(Boolean)
        .join(" — ");
    return {
        id,
        label,
        description,
        url,
        resultClass: String(options.resultClass ?? "text"),
        category: String(options.category ?? "Content"),
        searchText: [
            label,
            description,
            options.author,
            options.content,
            options.timestamp,
        ]
            .filter(Boolean)
            .join(" "),
        visible: true,
    };
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
