/**
 * Exposes every reusable Cognis browser module and shared stylesheet through a
 * validated, ctx-owned resource surface.
 *
 * Public exports:
 * - `COMMON_STYLESHEETS` — immutable names of all shared reuse stylesheets.
 * - `createReuseResources` — creates URL, import, and stylesheet-loading helpers.
 *
 * @example
 * const reuse = uiCtx.capabilities.get("ui:reuse");
 * const { createPageComposer } = await reuse.importModule(
 *     "page-composer/index.js",
 * );
 * await reuse.loadStylesheet("in-page-callout.css");
 *
 * @param {{importModule?: (url: string) => Promise<object>, loadStylesheet?: (url: string) => Promise<void>}} dependencies
 * @returns {{stylesheets: readonly string[], moduleUrl: (path: string) => string, stylesheetUrl: (path: string) => string, importModule: (path: string) => Promise<object>, loadStylesheet: (path: string) => Promise<void>, loadStylesheets: (paths: string[]) => Promise<void>, loadCommonStyles: () => Promise<void>}}
 */

import { ensurePageStylesheet } from "./page-styles.js";

export const COMMON_STYLESHEETS = Object.freeze([
    "button-loading.css",
    "char-counter.css",
    "floating-window.css",
    "graph.css",
    "hamburger-menu.css",
    "in-page-callout.css",
    "info-tooltip.css",
    "layout.css",
    "page-sections.css",
    "presence.css",
    "search-bar.css",
    "secret-visibility-toggle.css",
    "structured-content.css",
    "theme.css",
    "toast.css",
]);

function normalizeResourcePath(path, extension) {
    const normalized = String(path ?? "").trim();
    const segments = normalized.split("/");
    const valid =
        normalized.endsWith(extension) &&
        !normalized.includes("?") &&
        !normalized.includes("#") &&
        !normalized.endsWith(`.test${extension}`) &&
        segments.every(
            (segment) =>
                segment !== "" &&
                segment !== "." &&
                segment !== ".." &&
                segment !== "tests" &&
                /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(segment),
        );
    if (!valid) throw new TypeError("invalid_reuse_resource_path");
    return normalized;
}

export function createReuseResources({
    importModule = (url) => import(url),
    loadStylesheet = ensurePageStylesheet,
} = {}) {
    const moduleUrl = (path) =>
        `/static/reuse/${normalizeResourcePath(path, ".js")}`;
    const stylesheetUrl = (path) =>
        `/static/styles/reuse/${normalizeResourcePath(path, ".css")}`;
    const resources = {
        stylesheets: COMMON_STYLESHEETS,
        moduleUrl,
        stylesheetUrl,
        importModule: (path) => importModule(moduleUrl(path)),
        loadStylesheet: (path) => loadStylesheet(stylesheetUrl(path)),
        loadStylesheets: async (paths) => {
            if (!Array.isArray(paths))
                throw new TypeError("invalid_reuse_stylesheet_list");
            await Promise.all(
                paths.map((path) => loadStylesheet(stylesheetUrl(path))),
            );
        },
        loadCommonStyles: async () => {
            await Promise.all(
                COMMON_STYLESHEETS.map((path) =>
                    loadStylesheet(stylesheetUrl(path)),
                ),
            );
        },
    };
    return Object.freeze(resources);
}
