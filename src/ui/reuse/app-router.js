/**
 * Client-side application router for the Cognis dashboard shell.
 *
 * Intercepts clicks on internal navigation links and uses history.pushState()
 * to load new page content in place via each page's mount() function — no
 * full browser reload required.
 *
 * Public exports:
 *   initRouter(root)    — wire up click interception and popstate handling.
 *                         Call once after the dashboard shell is rendered.
 *   navigateTo(path)    — navigate to an in-app route programmatically.
 *   getCurrentBase()    — returns the base path of the currently mounted page.
 *   invalidateStudyChildComponentCache() — clears the cached Study child
 *                         component list; call after learning-language changes.
 *
 * Usage:
 *   import { initRouter } from '../reuse/app-router.js';
 *   initRouter(document.querySelector('#app'));
 *
 * Double-mount guard: when the router imports a page module for the first
 * time, the browser evaluates its top-level code, including the module-level
 * `await mount(...)` call used for direct URL loads. To prevent that from
 * running during SPA navigation, the router maintains `globalThis.__spaRouter`
 * (a boolean) and `globalThis.__spaRouterCount` (a reference count). The count
 * is incremented before each `route.load()` and decremented in its finally
 * block; `__spaRouter` is set to true on the first concurrent import and
 * cleared back to false only when the count reaches zero. Because JavaScript
 * is single-threaded, the increment executes atomically before any await —
 * there is no race between concurrent calls to loadRoute(). Each page guards
 * its direct-load call with `if (!globalThis.__spaRouter)`.
 *
 * @param {HTMLElement} root — the #app element.
 * @returns {void}
 */

import { ensurePageStylesheet } from "./page-styles.js";
import { apiFetch } from "./api-client.js";

const STUDY_BASE_STYLESHEETS = [
    "/static/styles/page-builder.css",
    "/static/styles/reuse/page-sections.css",
    "/static/gateways/study/study.css",
];

const STUDY_CHILD_ROUTE_PATTERN = /^\/study\/(?!welcome$|settings$)[^/]+$/;
const STUDY_CHILD_COMPONENT_CACHE_TTL_MS = 30_000;

let _studyChildComponentsPromise = null;
let _studyChildComponentsCache = null;
let _studyChildComponentsCacheExpiresAt = 0;

function normalizePath(path) {
    return String(path).split("?")[0].split("#")[0];
}

function isPotentialStudyChildPath(path) {
    const normalizedPath = normalizePath(path);
    return STUDY_CHILD_ROUTE_PATTERN.test(normalizedPath);
}

/**
 * Fetches a URL using the authenticated API client and parses the response as
 * JSON. Throws if the HTTP response is not ok.
 *
 * @param {string} urlPath - Absolute API path to fetch.
 * @returns {Promise<unknown>} Parsed JSON body.
 */
async function fetchJson(urlPath) {
    const response = await apiFetch(urlPath);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} while loading "${urlPath}"`);
    }
    return response.json();
}

/**
 * Loads the list of Study child component descriptors by querying the
 * registered-languages and per-language modules API endpoints. Results are
 * cached in memory for `STUDY_CHILD_COMPONENT_CACHE_TTL_MS` milliseconds so
 * rapid successive SPA navigations do not each trigger a fresh network round-
 * trip.
 *
 * @returns {Promise<Array<object>>} Array of child component descriptors.
 */
async function loadStudyChildComponents() {
    if (
        _studyChildComponentsCache &&
        Date.now() < _studyChildComponentsCacheExpiresAt
    ) {
        return _studyChildComponentsCache;
    }
    if (_studyChildComponentsPromise) {
        return _studyChildComponentsPromise;
    }
    _studyChildComponentsPromise = (async () => {
        try {
            const registeredLanguagesResponse = await fetchJson(
                "/api/v1/study/registered-languages",
            );
            const languages = Array.isArray(registeredLanguagesResponse?.data)
                ? registeredLanguagesResponse.data
                : [];
            const moduleResponses = await Promise.all(
                languages.map((language) =>
                    fetchJson(
                        `/api/v1/study/languages/${encodeURIComponent(String(language.code ?? ""))}/modules`,
                    ).catch(() => ({ data: [] })),
                ),
            );
            const components = moduleResponses.flatMap((modulesResponse) =>
                Array.isArray(modulesResponse?.data)
                    ? modulesResponse.data
                    : [],
            );
            _studyChildComponentsCache = components;
            _studyChildComponentsCacheExpiresAt =
                Date.now() + STUDY_CHILD_COMPONENT_CACHE_TTL_MS;
            return components;
        } finally {
            _studyChildComponentsPromise = null;
        }
    })();
    return _studyChildComponentsPromise;
}

/**
 * Resolves a URL path to a Study child component descriptor (scriptUrl and
 * stylesheets) if the path matches a dynamically-registered Study child route.
 * Returns null for non-Study paths and for Study paths that have no matching
 * registered component.
 *
 * @param {string} path - URL path to resolve (e.g. '/study/hiragana').
 * @returns {Promise<{scriptUrl: string, stylesheets: string[]} | null>}
 */
async function resolveStudyChildComponent(path) {
    if (!isPotentialStudyChildPath(path)) {
        return null;
    }
    const normalizedPath = normalizePath(path);
    const components = await loadStudyChildComponents();
    const component = components.find(
        (candidate) => String(candidate?.pageUrl ?? "") === normalizedPath,
    );
    if (!component) {
        return null;
    }
    const scriptUrl = String(component.scriptUrl ?? "").trim();
    if (!scriptUrl) {
        return null;
    }
    const stylesheets = Array.isArray(component.stylesheets)
        ? component.stylesheets
              .map((stylesheetUrl) => String(stylesheetUrl ?? "").trim())
              .filter(Boolean)
        : [];
    return {
        scriptUrl,
        stylesheets,
    };
}

/**
 * Dynamically loads the ES module for a Study child route. Ensures all
 * module-declared stylesheets are injected into the document before the
 * module script executes. Throws if no component is registered for the path
 * or if the dynamic import fails.
 *
 * @param {string} path - URL path to load (e.g. '/study/hiragana').
 * @returns {Promise<object>} The imported ES module namespace.
 */
async function loadStudyChildRouteModule(path) {
    const component = await resolveStudyChildComponent(path);
    if (!component) {
        throw new Error(`No dynamic Study child module found for "${path}"`);
    }
    if (component.stylesheets.length) {
        await Promise.all(component.stylesheets.map(ensurePageStylesheet));
    }
    try {
        return await import(component.scriptUrl);
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(
            `Failed to load Study child module "${path}" from "${component.scriptUrl}": ${errorMessage}`,
        );
    }
}

const ROUTES = [
    {
        pattern: /^\/dashboard$/,
        base: "/dashboard",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
        ],
        load: () => import("../app/dashboard/index.js"),
    },
    {
        pattern: /^\/settings/,
        base: "/settings",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/styles/settings.css",
        ],
        load: () => import("../app/settings/index.js"),
    },
    {
        pattern: /^\/modules$/,
        base: "/modules",
        stylesheets: ["/static/styles/page-builder.css"],
        load: () => import("../app/modules/index.js"),
    },
    {
        pattern: /^\/users/,
        base: "/users",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
        ],
        load: () => import("../app/users/index.js"),
    },
    {
        pattern: /^\/invite$/,
        base: "/invite",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
        ],
        load: () => import("../app/invite/index.js"),
    },
    {
        pattern: /^\/administration/,
        base: "/administration",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
        ],
        load: () => import("../app/administration/index.js"),
    },
    {
        pattern: /^\/docs/,
        base: "/docs",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
        ],
        load: () => import("../app/docs/index.js"),
    },
    {
        pattern: /^\/license$/,
        base: "/license",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/styles/license.css",
        ],
        load: () => import("../app/license/index.js"),
    },
    {
        pattern: /^\/study(?:\/welcome|\/settings)?$/,
        base: "/study",
        stylesheets: STUDY_BASE_STYLESHEETS,
        load: () => import("/static/gateways/study/study.js"),
    },
    {
        pattern: STUDY_CHILD_ROUTE_PATTERN,
        base: "/study",
        stylesheets: STUDY_BASE_STYLESHEETS,
        load: (path) => loadStudyChildRouteModule(path),
    },
];

function findRoute(path) {
    const pathWithoutQueryOrFragment = normalizePath(path);
    return ROUTES.find((r) => r.pattern.test(pathWithoutQueryOrFragment));
}

let _root = null;
let _currentBase = null;
let _mountController = null;
let _initialized = false;

async function loadRoute(path) {
    const route = findRoute(path);
    if (!route) return false;

    if (_mountController) {
        _mountController.abort();
    }
    _mountController = new AbortController();
    _currentBase = route.base;
    const { signal } = _mountController;

    // Start stylesheet injection and module loading in parallel — both are
    // network operations and can race. We await both before calling mount()
    // so CSS is guaranteed present before the page touches the DOM.
    const stylesheetsReady = route.stylesheets?.length
        ? Promise.all(route.stylesheets.map(ensurePageStylesheet))
        : Promise.resolve();

    globalThis.__spaRouterCount = (globalThis.__spaRouterCount ?? 0) + 1;
    globalThis.__spaRouter = true;
    let mod;
    try {
        mod = await route.load(path);
    } finally {
        globalThis.__spaRouterCount--;
        if (globalThis.__spaRouterCount === 0) {
            globalThis.__spaRouter = false;
        }
    }
    await stylesheetsReady;
    // If another navigation started while loading, bail out.
    if (signal.aborted) return false;
    try {
        await mod.mount(_root, { signal });
    } catch (err) {
        if (!signal.aborted) {
            console.error("[router] mount() error for", path, err);
        }
    }
    return true;
}

export async function navigateTo(path) {
    if (!findRoute(path)) return;
    if (isPotentialStudyChildPath(path)) {
        const component = await resolveStudyChildComponent(path);
        if (!component) return;
    }
    history.pushState({ routerPage: path }, "", path);
    await loadRoute(path);
}

/**
 * Invalidates the in-memory Study child component cache so the next navigation
 * to a Study child route fetches a fresh list from the API. Call this after
 * the user changes their learning-language preferences.
 *
 * @returns {void}
 */
export function invalidateStudyChildComponentCache() {
    _studyChildComponentsCache = null;
    _studyChildComponentsCacheExpiresAt = 0;
}

export function getCurrentBase() {
    return _currentBase;
}

export function initRouter(root) {
    if (_initialized) return;
    _initialized = true;
    _root = root;

    const initialRoute = findRoute(window.location.pathname);
    _currentBase = initialRoute ? initialRoute.base : null;

    document.addEventListener("click", async (event) => {
        const link = event.target.closest("a[href]");
        if (!link) return;
        const href = link.getAttribute("href");
        if (
            !href ||
            href.startsWith("http") ||
            href.startsWith("//") ||
            href.startsWith("#")
        )
            return;
        if (!findRoute(href)) return;
        event.preventDefault();
        await navigateTo(href);
    });

    window.addEventListener("popstate", async (event) => {
        const path = window.location.pathname;
        const route = findRoute(path);
        if (!route) return;
        if (isPotentialStudyChildPath(path)) {
            const component = await resolveStudyChildComponent(path);
            if (!component) return;
        }
        // If navigating within the same page section (e.g. docs internal
        // pushState) and this wasn't a router-level push, let the page's
        // own popstate handler deal with it (handled by AbortSignal cleanup).
        // `event.state?.routerPage` is set by navigateTo() via history.pushState,
        // so its presence means the router itself triggered this history entry and
        // must handle the transition even if the base path hasn't changed.
        if (route.base === _currentBase && !event.state?.routerPage) return;
        await loadRoute(path);
    });
}
