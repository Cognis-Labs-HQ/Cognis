/**
 * Client-side application router for the Cognis dashboard shell.
 *
 * Intercepts clicks on internal navigation links and uses history.pushState()
 * to load new page content in place via each page's mount() function — no
 * full browser reload required.
 *
 * Auth enforcement during navigation is handled by the `authenticate-session`
 * flow (registered in `page-flow-catalog.js`). The router runs that flow in
 * `loadRoute()` and redirects when the flow result requires it, with no
 * inline auth logic or session-state variables in this file.
 *
 * Public exports:
 *   initRouter(root)    — wire up click interception and popstate handling.
 *                         Call once after the dashboard shell is rendered.
 *   navigateTo(path)    — navigate to an in-app route programmatically.
 *   getCurrentBase()    — returns the base path of the currently mounted page.
 *   invalidateSpaRouteCache() — clears cached dynamic SPA route descriptors.
 *   `router:invalidateRoutes` — ctx capability for invalidating those routes.
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

import { ensurePageStylesheet, preparePageStylesheets } from "./page-styles.js";
import { apiFetch } from "./api-client.js";
import {
    beginPageLoading,
    ensureHostUiProviders,
    loadWithSpaImportGuard,
} from "./page-entry.js";
import { getCurrentRoutePath } from "./route-path.js";
import { clearSpaRouteCache, loadSpaRoutes } from "./spa-route-registry.js";
import {
    installRuntimeErrorHandlers,
    openRuntimeErrorPopup,
} from "./runtime-error-popup.js";
import {
    isGuestAllowedPath,
    openGuestBlockedPopup,
} from "./guest-blocked-popup.js";
import "./page-flow-catalog.js";
import { uiCtx } from "./ui-ctx.js";
import { installComponentPageBroker } from "./component-page-broker.js";
import {
    observePerformance,
    recordRouteMount,
} from "./performance-telemetry.js";

observePerformance();

const STUDY_BASE_STYLESHEETS = [
    "/static/styles/page-builder.css",
    "/static/styles/reuse/page-sections.css",
    "/static/gateways/study/study.css",
];
const ROUTE_STYLE_BUNDLES = {
    pageSections: [
        "/static/styles/page-builder.css",
        "/static/styles/reuse/page-sections.css",
    ],
    settings: [
        "/static/styles/page-builder.css",
        "/static/styles/reuse/page-sections.css",
        "/static/styles/reuse/structured-content.css",
        "/static/styles/settings.css",
    ],
    docs: [
        "/static/styles/page-builder.css",
        "/static/styles/reuse/page-sections.css",
        "/static/styles/docs.css",
    ],
    license: [
        "/static/styles/page-builder.css",
        "/static/styles/reuse/page-sections.css",
        "/static/styles/license.css",
    ],
    study: STUDY_BASE_STYLESHEETS,
};

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
                    ).catch((fetchError) => {
                        console.warn(
                            "[router] Failed to load Study child components for language.",
                            language.code,
                            fetchError,
                        );
                        return { data: [] };
                    }),
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

const CORE_COMPONENT_UUID = "b4d49c4a-61d0-5db2-84fd-f89b80fd6398";
const STUDY_COMPONENT_UUID = "338b9237-a2c8-5bcf-9437-bccc9abd9a27";

function componentPage(
    labelKey,
    descriptionKey,
    modes = ["overlay", "fullscreen"],
) {
    return { labelKey, descriptionKey, modes };
}

const STATIC_ROUTES = [
    {
        id: "core.dashboard",
        ownerUuid: CORE_COMPONENT_UUID,
        componentPage: componentPage(
            "ui.reuse.dashboard",
            "ui.app.dashboard.page_subtitle",
        ),
        pattern: /^\/dashboard$/,
        base: "/dashboard",
        stylesheets: ROUTE_STYLE_BUNDLES.pageSections,
        load: () => import("../app/dashboard/index.js"),
    },
    {
        id: "core.settings",
        ownerUuid: CORE_COMPONENT_UUID,
        componentPage: componentPage(
            "ui.reuse.settings",
            "ui.app.settings.page_subtitle",
        ),
        pattern: /^\/settings/,
        base: "/settings",
        stylesheets: ROUTE_STYLE_BUNDLES.settings,
        load: () => import("../app/settings/index.js"),
    },
    {
        id: "core.users",
        ownerUuid: CORE_COMPONENT_UUID,
        componentPage: componentPage(
            "ui.reuse.users",
            "ui.app.users.page_subtitle",
        ),
        pattern: /^\/users/,
        base: "/users",
        stylesheets: ROUTE_STYLE_BUNDLES.pageSections,
        load: () => import("../app/users/index.js"),
    },
    {
        id: "core.invite",
        ownerUuid: CORE_COMPONENT_UUID,
        componentPage: componentPage(
            "ui.reuse.invite",
            "ui.app.invite.page_subtitle",
        ),
        pattern: /^\/invite$/,
        base: "/invite",
        stylesheets: ROUTE_STYLE_BUNDLES.pageSections,
        load: () => import("../app/invite/index.js"),
    },
    {
        id: "core.modules",
        ownerUuid: CORE_COMPONENT_UUID,
        componentPage: componentPage(
            "ui.reuse.modules",
            "ui.app.modules.subtitle",
        ),
        pattern: /^\/administration\/modules/,
        base: "/administration/modules",
        stylesheets: [
            ...ROUTE_STYLE_BUNDLES.pageSections,
            "/static/styles/modules.css",
        ],
        load: () => import("../app/modules/index.js"),
    },
    {
        id: "core.administration",
        ownerUuid: CORE_COMPONENT_UUID,
        componentPage: componentPage(
            "ui.reuse.administration",
            "ui.app.admin.page_subtitle",
        ),
        pattern: /^\/administration/,
        base: "/administration",
        stylesheets: [
            ...ROUTE_STYLE_BUNDLES.pageSections,
            "/static/styles/reuse/structured-content.css",
        ],
        load: () => import("../app/administration/index.js"),
    },
    {
        id: "core.docs",
        ownerUuid: CORE_COMPONENT_UUID,
        componentPage: componentPage(
            "ui.reuse.docs",
            "ui.app.docs.page_subtitle",
        ),
        pattern: /^\/docs/,
        base: "/docs",
        stylesheets: ROUTE_STYLE_BUNDLES.docs,
        load: () => import("../app/docs/index.js"),
    },
    {
        id: "core.changelogs",
        ownerUuid: CORE_COMPONENT_UUID,
        componentPage: componentPage(
            "ui.app.changelogs.page_title",
            "ui.app.changelogs.page_subtitle",
        ),
        pattern: /^\/changelogs/,
        base: "/changelogs",
        stylesheets: ROUTE_STYLE_BUNDLES.docs,
        load: () => import("../app/changelogs/index.js"),
    },
    {
        id: "core.license",
        ownerUuid: CORE_COMPONENT_UUID,
        componentPage: componentPage(
            "ui.app.license.page_title",
            "ui.app.license.page_subtitle",
        ),
        pattern: /^\/license$/,
        base: "/license",
        stylesheets: ROUTE_STYLE_BUNDLES.license,
        load: () => import("../app/license/index.js"),
    },
    {
        id: "core.error",
        ownerUuid: CORE_COMPONENT_UUID,
        componentPage: componentPage(
            "ui.reuse.error",
            "ui.app.error.page_subtitle",
        ),
        pattern: /^\/error$/,
        base: "/error",
        public: true,
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/styles/error.css",
        ],
        load: () => import("../app/error/index.js"),
    },
    {
        id: "gateway.study",
        ownerUuid: STUDY_COMPONENT_UUID,
        componentPage: componentPage(
            "gateway.study.page_title",
            "gateway.study.page_subtitle",
        ),
        pattern: /^\/study(?:\/welcome|\/settings)?$/,
        base: "/study",
        stylesheets: ROUTE_STYLE_BUNDLES.study,
        load: () => import("/static/gateways/study/study.js"),
    },
    {
        id: "gateway.study.child",
        ownerUuid: STUDY_COMPONENT_UUID,
        componentPage: componentPage(
            "gateway.study.page_title",
            "gateway.study.page_subtitle",
        ),
        pattern: STUDY_CHILD_ROUTE_PATTERN,
        base: "/study",
        stylesheets: ROUTE_STYLE_BUNDLES.study,
        fallback: true,
        canNavigate: async (path) =>
            Boolean(await resolveStudyChildComponent(path)),
        load: (path) => loadStudyChildRouteModule(path),
    },
];

installComponentPageBroker({
    resolveLocal: async ({ componentUuid, routeId, mode }) =>
        (await loadAllRoutes()).find(
            (route) =>
                route.id === routeId &&
                (!componentUuid || route.ownerUuid === componentUuid) &&
                (!componentUuid ||
                    (route.componentPage &&
                        (!mode || route.componentPage.modes.includes(mode)))),
        ) ?? null,
});

let _allRoutes = null;
let _allRoutesPromise = null;
let _routeCacheGeneration = 0;

function findMatchingRoute(routes, path) {
    const pathWithoutQueryOrFragment = normalizePath(path);
    return routes.find((route) =>
        route.pattern.test(pathWithoutQueryOrFragment),
    );
}

async function loadAllRoutes() {
    if (_allRoutes) return _allRoutes;
    if (_allRoutesPromise) return _allRoutesPromise;
    const loadGeneration = _routeCacheGeneration;
    const loadPromise = (async () => {
        const dynamicRoutes = await loadSpaRoutes();
        const primaryRoutes = STATIC_ROUTES.filter((route) => !route.fallback);
        const fallbackRoutes = STATIC_ROUTES.filter((route) => route.fallback);
        const routes = [...primaryRoutes, ...dynamicRoutes, ...fallbackRoutes];
        if (loadGeneration === _routeCacheGeneration) {
            _allRoutes = routes;
        }
        return routes;
    })();
    _allRoutesPromise = loadPromise;
    try {
        return await loadPromise;
    } finally {
        if (_allRoutesPromise === loadPromise) {
            _allRoutesPromise = null;
        }
    }
}

function findRoute(path) {
    if (_allRoutes) {
        return findMatchingRoute(_allRoutes, path);
    }
    return findMatchingRoute(STATIC_ROUTES, path);
}

async function resolveRoute(path) {
    const staticRoute = findMatchingRoute(STATIC_ROUTES, path);
    if (staticRoute && !staticRoute.fallback) {
        return staticRoute;
    }
    return findMatchingRoute(await loadAllRoutes(), path);
}

async function canNavigateToRoute(route, path) {
    return !route.canNavigate || (await route.canNavigate(path));
}

let _root = null;
let _currentBase = null;

function resolveRouterRoot() {
    if (_root) return _root;
    _root = document.querySelector("#app");
    return _root;
}

let _mountController = null;
let _navigationSequence = 0;
let _initialized = false;

async function loadRoute(path) {
    const navigationSequence = ++_navigationSequence;
    if (_mountController) {
        _mountController.abort();
    }
    const navigationController = new AbortController();
    _mountController = navigationController;
    const { signal } = navigationController;
    const routeMountStartedAt = performance.now();
    const route = await resolveRoute(path);
    if (
        !route ||
        signal.aborted ||
        navigationSequence !== _navigationSequence
    ) {
        return false;
    }

    // Load the destination entry before authentication so its gateway-owned
    // flow hooks participate in this navigation's authenticate-session run.
    // The router flag prevents the entry's direct-load mount from running.
    let mod;
    try {
        await ensureHostUiProviders();
        mod = await loadWithSpaImportGuard(() => route.load(path));
    } catch (error) {
        console.error("[router] route load error for", path, error);
        await openRuntimeErrorPopup({
            error,
            contextKey: "ui.reuse.runtime_error_context_route_load",
            contextDetail: path,
        });
        return false;
    }
    if (signal.aborted || navigationSequence !== _navigationSequence) {
        return false;
    }

    const authResult = route.public
        ? null
        : await uiCtx.runFlow("authenticate-session", {
              routePath: path,
          });
    if (signal.aborted || navigationSequence !== _navigationSequence) {
        return false;
    }
    const session = route.public
        ? null
        : ((authResult?.stageResults?.["resolve-session"] ?? [])[0] ?? null);

    await ensureHostUiProviders();
    if (signal.aborted || navigationSequence !== _navigationSequence) {
        return false;
    }

    const isGuestContentPath =
        uiCtx.capabilities.get("session:isGuestAllowedPath")?.(
            new URL(path, window.location.origin).pathname +
                new URL(path, window.location.origin).search,
        ) === true;
    if (
        session?.isGuestSession === true &&
        !isGuestAllowedPath(path) &&
        !isGuestContentPath
    ) {
        await openGuestBlockedPopup({ currentRoutePath: path });
        return false;
    }

    if (session?.requiresRedirect && session.redirectTo) {
        const enforcedPath = session.redirectTo;
        if (window.location.pathname + window.location.hash !== enforcedPath) {
            history.replaceState(
                { routerPage: enforcedPath },
                "",
                enforcedPath,
            );
        }
        return loadRoute(enforcedPath);
    }

    const finishPageLoading = beginPageLoading();
    try {
        window.dispatchEvent(new CustomEvent("cognis:route-will-change"));
        uiCtx.capabilities.get("page:actions")?.reset?.();
        _currentBase = route.base;

        // Prepare the destination styles before calling mount() so CSS is
        // guaranteed present before the page touches the DOM.
        const stylesheetsReady = preparePageStylesheets(
            route.stylesheets ?? [],
        );

        const commitPageStylesheets = await stylesheetsReady;
        // If another navigation started while loading, bail out.
        if (signal.aborted) return false;
        try {
            const routeRoot = resolveRouterRoot();
            if (!routeRoot) return false;
            commitPageStylesheets();
            await mod.mount(routeRoot, {
                signal,
                shareContext: session?.shareContext ?? null,
            });
            recordRouteMount(path, performance.now() - routeMountStartedAt);
        } catch (error) {
            if (!signal.aborted) {
                console.error("[router] mount() error for", path, error);
                finishPageLoading();
                await openRuntimeErrorPopup({
                    error,
                    contextKey: "ui.reuse.runtime_error_context_route_mount",
                    contextDetail: path,
                });
            }
        }
        return true;
    } catch (error) {
        if (_mountController?.signal?.aborted) {
            return false;
        }
        console.error("[router] route load error for", path, error);
        finishPageLoading();
        await openRuntimeErrorPopup({
            error,
            contextKey: "ui.reuse.runtime_error_context_route_load",
            contextDetail: path,
        });
        return false;
    } finally {
        finishPageLoading();
    }
}

export async function navigateTo(path, { state = {} } = {}) {
    const route = await resolveRoute(path);
    if (!route) return false;
    if (!(await canNavigateToRoute(route, path))) return false;
    const previousRouterPage = getCurrentRoutePath();
    history.pushState(
        { ...state, routerPage: path, previousRouterPage },
        "",
        path,
    );
    return loadRoute(path);
}

uiCtx.capabilities.contribute("ui:navigate", navigateTo);
uiCtx.capabilities.contribute(
    "router:invalidateRoutes",
    invalidateSpaRouteCache,
);

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

/**
 * Invalidates the in-memory dynamic SPA route cache so the next navigation can
 * re-fetch route descriptors contributed by gateways/adapters.
 *
 * @returns {void}
 */
export function invalidateSpaRouteCache() {
    _routeCacheGeneration += 1;
    clearSpaRouteCache();
    _allRoutes = null;
    _allRoutesPromise = null;
}

export function getCurrentBase() {
    return _currentBase;
}

export function initRouter(root) {
    if (root) _root = root;
    if (_initialized) return;
    _initialized = true;
    installRuntimeErrorHandlers();

    void loadAllRoutes();
    const initialRoute = findRoute(window.location.pathname);
    _currentBase = initialRoute ? initialRoute.base : null;
    if (!_currentBase) {
        void resolveRoute(window.location.pathname).then((resolvedRoute) => {
            if (resolvedRoute) {
                _currentBase = resolvedRoute.base;
            }
        });
    }

    document.addEventListener("click", async (event) => {
        if (event.defaultPrevented) return;
        const link = event.target.closest("a[href]");
        if (!link) return;
        const href = link.getAttribute("href");
        if (
            !href ||
            href.startsWith("http") ||
            href.startsWith("//") ||
            href.startsWith("#") ||
            !href.startsWith("/")
        )
            return;
        event.preventDefault();
        const route = await resolveRoute(href);
        if (!route) {
            window.location.assign(href);
            return;
        }
        const studyLanguageCode = link.dataset.languageCode;
        await navigateTo(href, {
            state: studyLanguageCode ? { studyLanguageCode } : {},
        });
    });

    window.addEventListener("popstate", async (event) => {
        const path = window.location.pathname;
        const pathWithHash = `${window.location.pathname}${window.location.hash}`;
        const route = await resolveRoute(path);
        if (!route) return;
        if (!(await canNavigateToRoute(route, path))) return;
        // If navigating within the same page section (e.g. docs internal
        // pushState) and this wasn't a router-level push, let the page's
        // own popstate handler deal with it (handled by AbortSignal cleanup).
        // `event.state?.routerPage` is set by navigateTo() via history.pushState,
        // so its presence means the router itself triggered this history entry and
        // must handle the transition even if the base path hasn't changed.
        if (route.base === _currentBase && !event.state?.routerPage) return;
        await loadRoute(pathWithHash);
    });
}
