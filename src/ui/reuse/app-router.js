import { registerPageRedraw } from "./page-redraw.js";
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
 *   navigateTo(path, options) — navigate in-app with optional history state.
 *   getCurrentBase()    — returns the base path of the currently mounted page.
 *   invalidateSpaRouteCache() — clears cached dynamic SPA route descriptors.
 *   `router:invalidateRoutes` — ctx capability for invalidating those routes.
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

import { isOffline, offlineWorkerRequest } from "./offline-state.js";
import {
    offlineRouteAvailable,
    allowOfflineRoute,
    recoverOfflineNavigation,
} from "./offline-navigation.js";
import { prepareOfflineRouteAssets } from "./offline-route-assets.js";
import { showOfflineUnavailable } from "./offline-unavailable.js";
import { isMountSignal } from "./mount-scope.js";
import { adoptPageStylesheets, preparePageStylesheets } from "./page-styles.js";
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
};

function normalizePath(path) {
    return String(path).split("?")[0].split("#")[0];
}

const CORE_COMPONENT_UUID = "b4d49c4a-61d0-5db2-84fd-f89b80fd6398";

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
        offline: { session: true },
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
        offline: { session: true },
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
        public: true,
        offline: { assets: [] },
        offlineAvailable: true,
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
        offline: { assets: [] },
        offlineAvailable: true,
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/styles/error.css",
        ],
        load: () => import("../app/error/index.js"),
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
    if (isOffline()) return [...STATIC_ROUTES, ...(await loadSpaRoutes())];
    if (_allRoutesPromise) return _allRoutesPromise;
    const loadGeneration = _routeCacheGeneration;
    const loadPromise = (async () => {
        const dynamicRoutes = await loadSpaRoutes();
        const routes = [...STATIC_ROUTES, ...dynamicRoutes];
        if (loadGeneration === _routeCacheGeneration) {
            _allRoutes = routes;
            prepareOfflineRouteAssets(
                routes.filter((route) => offlineRouteAvailable(route)),
            );
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
    if (staticRoute) {
        return staticRoute;
    }
    const allRoutes = await loadAllRoutes();
    return findMatchingRoute(allRoutes, path);
}

let _root = null;
let _currentBase = null;

function resolveRouterRoot() {
    if (_root) return _root;
    _root = document.querySelector("#app");
    return _root;
}

let _mountController = null;
let _commitPage = null;
let _navigationSequence = 0;
let _initialized = false;
let _historyIndex = 0;
let _committedPath = "";
let _lastSuccessfulPath = "";
let _previousSuccessfulPath = "";
let _restoringHistory = false;
let _guardBypassPath = null;

function requestRouteNavigation(path, resume) {
    const navigationEvent = new CustomEvent("cognis:route-before-navigate", {
        cancelable: true,
        detail: { path, resume },
    });
    return window.dispatchEvent(navigationEvent);
}

async function loadRoute(path) {
    const navigationSequence = ++_navigationSequence;
    if (_mountController) {
        _mountController.abort();
    }
    const navigationController = new AbortController();
    _mountController = navigationController;
    const { signal } = navigationController;
    const finishPageLoading = beginPageLoading();
    signal.addEventListener("abort", finishPageLoading, { once: true });
    try {
        return await loadRouteContent(
            path,
            signal,
            navigationSequence,
            finishPageLoading,
        );
    } finally {
        signal.removeEventListener("abort", finishPageLoading);
        finishPageLoading();
    }
}

async function loadRouteContent(
    path,
    signal,
    navigationSequence,
    finishPageLoading,
) {
    const routeMountStartedAt = performance.now();
    const route = await resolveRoute(path);
    if (
        !route ||
        signal.aborted ||
        navigationSequence !== _navigationSequence
    ) {
        return false;
    }
    if (!(await allowOfflineRoute(route, path, signal))) return false;
    globalThis.__cognisPublicSpaRoute = route.public === true;
    globalThis.__cognisPublicSpaRoutePageContext = route.componentPage ?? null;

    // Load the destination entry before authentication so its gateway-owned
    // flow hooks participate in this navigation's authenticate-session run.
    // The router flag prevents the entry's direct-load mount from running.
    let mod;
    try {
        if (!isOffline()) {
            await ensureHostUiProviders();
            void loadAllRoutes().then((routes) =>
                prepareOfflineRouteAssets(
                    routes.filter((candidate) =>
                        offlineRouteAvailable(candidate),
                    ),
                ),
            );
        }
        if (!(await allowOfflineRoute(route, path, signal))) return false;
        mod = await loadWithSpaImportGuard(() => route.load(path));
    } catch (error) {
        if (signal.aborted || navigationSequence !== _navigationSequence)
            return false;
        console.error("[router] route load error for", path, error);
        finishPageLoading();
        if (isOffline()) return false;
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
    if (!(await allowOfflineRoute(route, path, signal))) return false;
    const session = route.public
        ? null
        : ((authResult?.stageResults?.["resolve-session"] ?? [])[0] ?? null);

    if (!isOffline()) await ensureHostUiProviders();
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
        finishPageLoading();
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

    let commitPageStylesheets = null;
    let observer = null;
    let commit = null;
    try {
        // Prepare the destination styles before calling mount() so CSS is
        // guaranteed present before the page touches the DOM.
        const stylesheetsReady = preparePageStylesheets(
            route.stylesheets ?? [],
            { signal },
        );

        commitPageStylesheets = await stylesheetsReady;
        // If another navigation started while loading, bail out.
        if (signal.aborted || !commitPageStylesheets) return false;
        try {
            const routeRoot = resolveRouterRoot();
            if (!routeRoot) return false;
            let committed = false;
            commit = (root, mountSignal) => {
                if (
                    committed ||
                    signal.aborted ||
                    navigationSequence !== _navigationSequence ||
                    root !== routeRoot
                )
                    return false;
                if (mountSignal && !isMountSignal(mountSignal, signal))
                    return false;
                committed = true;
                observer?.disconnect();
                commitPageStylesheets();
                _currentBase = route.base;
                return true;
            };
            _commitPage = commit;
            window.dispatchEvent(new CustomEvent("cognis:route-will-change"));
            uiCtx.capabilities.get("page:actions")?.reset?.();
            if (typeof MutationObserver !== "undefined") {
                observer = new MutationObserver(() => commit(routeRoot));
                observer.observe(routeRoot, { childList: true });
                const content = routeRoot.querySelector?.(".main-window");
                if (content) observer.observe(content, { childList: true });
            }
            signal.addEventListener("abort", () => observer?.disconnect(), {
                once: true,
            });
            await mod.mount(routeRoot, {
                signal,
                shareContext: session?.shareContext ?? null,
            });
            if (signal.aborted || navigationSequence !== _navigationSequence)
                return false;
            commit(routeRoot);
            if (_lastSuccessfulPath !== path)
                _previousSuccessfulPath = _lastSuccessfulPath;
            _lastSuccessfulPath = path;
            uiCtx.capabilities.get("offline:recordRouteAssets")?.(route);
            recordRouteMount(path, performance.now() - routeMountStartedAt);
        } catch (error) {
            if (!signal.aborted) {
                console.error("[router] mount() error for", path, error);
                finishPageLoading();
                observer?.disconnect();
                if (_commitPage === commit) _commitPage = null;
                commitPageStylesheets?.cancel();
                if (isOffline()) return false;
                await openRuntimeErrorPopup({
                    error,
                    contextKey: "ui.reuse.runtime_error_context_route_mount",
                    contextDetail: path,
                });
            }
            return false;
        }
        return true;
    } catch (error) {
        if (signal.aborted) {
            return false;
        }
        console.error("[router] route load error for", path, error);
        finishPageLoading();
        if (isOffline()) return false;
        await openRuntimeErrorPopup({
            error,
            contextKey: "ui.reuse.runtime_error_context_route_load",
            contextDetail: path,
        });
        return false;
    } finally {
        observer?.disconnect();
        if (_commitPage === commit) _commitPage = null;
        commitPageStylesheets?.cancel();
    }
}

export async function navigateTo(
    path,
    {
        bypassGuard = false,
        state = {},
        replace = false,
        recoverOfflineFailure = true,
    } = {},
) {
    const route = await resolveRoute(path);
    if (!(await allowOfflineRoute(route, path))) {
        if (recoverOfflineFailure) await restoreAfterOfflineFailure(path);
        return false;
    }
    if (!route) return false;
    if (
        !bypassGuard &&
        !requestRouteNavigation(path, () =>
            navigateTo(path, { bypassGuard: true, state }),
        )
    )
        return false;
    const previousRouterPage = getCurrentRoutePath();
    if (!replace) _historyIndex += 1;
    _committedPath = path;
    history[replace ? "replaceState" : "pushState"](
        {
            ...state,
            routerPage: path,
            previousRouterPage,
            routerIndex: _historyIndex,
        },
        "",
        path,
    );
    const expectedSequence = _navigationSequence + 1;
    const mounted = await loadRoute(path);
    if (
        !mounted &&
        isOffline() &&
        expectedSequence === _navigationSequence &&
        recoverOfflineFailure
    )
        await restoreAfterOfflineFailure(path);
    return mounted;
}

async function restoreAfterOfflineFailure(
    path,
    { notify = true, fallback } = {},
) {
    const previous =
        (_lastSuccessfulPath !== path
            ? _lastSuccessfulPath
            : _previousSuccessfulPath) ||
        history.state?.previousRouterPage ||
        internalNavigationPath(document.referrer);
    let recoverySequence = _navigationSequence;
    return recoverOfflineNavigation({
        notify,
        fallback: () => {
            if (isOffline() && recoverySequence === _navigationSequence)
                return fallback?.(
                    () => recoverySequence === _navigationSequence,
                );
        },
        restore: async () => {
            if (!previous || previous === path) return false;
            if (
                getCurrentRoutePath() === previous &&
                _lastSuccessfulPath === previous
            )
                return true;
            if (
                !(await allowOfflineRoute(
                    await resolveRoute(previous),
                    previous,
                ))
            )
                return false;
            recoverySequence = _navigationSequence + 1;
            return navigateTo(previous, {
                replace: true,
                bypassGuard: true,
                recoverOfflineFailure: false,
            });
        },
    });
}

uiCtx.capabilities.contribute("ui:navigate", navigateTo);
registerPageRedraw(uiCtx, {
    currentPath: getCurrentRoutePath,
    resolveRoute,
    allowOfflineRoute,
    requestNavigation: requestRouteNavigation,
    mount: loadRoute,
});
uiCtx.capabilities.contribute(
    "router:invalidateRoutes",
    invalidateSpaRouteCache,
);

/**
 * Invalidates the in-memory dynamic SPA route cache so the next navigation can
 * re-fetch route descriptors contributed by gateways/adapters.
 *
 * @returns {void}
 */
export function invalidateSpaRouteCache() {
    _routeCacheGeneration += 1;
    clearSpaRouteCache();
    void offlineWorkerRequest("COGNIS_INVALIDATE_OFFLINE_ROUTES")
        .then(
            () =>
                !isOffline() &&
                offlineWorkerRequest("COGNIS_REFRESH_OFFLINE_ROUTES"),
        )
        .catch(console.error);
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
    const initialRoute = findRoute(window.location.pathname);
    adoptPageStylesheets(initialRoute?.stylesheets ?? []);
    uiCtx.capabilities.contribute("navigation:commitPage", (root, signal) => {
        if (signal) return _commitPage?.(root, signal) ?? false;
        return false;
    });
    installRuntimeErrorHandlers();
    installOfflineNavigation();

    _historyIndex = Number.isInteger(history.state?.routerIndex)
        ? history.state.routerIndex
        : 0;
    _committedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (initialRoute && root?.childElementCount) {
        _lastSuccessfulPath = _committedPath;
        uiCtx.capabilities.get("offline:recordRouteAssets")?.(initialRoute);
    }
    history.replaceState(
        { ...(history.state ?? {}), routerIndex: _historyIndex },
        "",
        _committedPath,
    );

    void loadAllRoutes();
    _currentBase = initialRoute ? initialRoute.base : null;
    if (!_currentBase) {
        void resolveRoute(window.location.pathname).then((resolvedRoute) => {
            if (resolvedRoute) {
                _currentBase = resolvedRoute.base;
            }
        });
    }

    document.addEventListener("click", async (event) => {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        )
            return;
        const link = event.target.closest("a[href]");
        if (
            !link ||
            link.hasAttribute("download") ||
            (link.target && link.target !== "_self")
        )
            return;
        if (link.getAttribute("aria-disabled") === "true") {
            event.preventDefault();
            return;
        }
        const routePath = internalNavigationPath(link.getAttribute("href"));
        if (routePath === null) return;
        event.preventDefault();
        const route = await resolveRoute(routePath);
        if (!route) {
            if (!(await allowOfflineRoute(null, routePath))) {
                await restoreAfterOfflineFailure(routePath);
                return;
            }
            window.location.assign(routePath);
            return;
        }
        await navigateTo(routePath);
    });

    window.addEventListener("popstate", async (event) => {
        if (_restoringHistory) {
            _restoringHistory = false;
            return;
        }
        const path = window.location.pathname;
        const pathWithHash = getCurrentRoutePath();
        const route = await resolveRoute(path);
        if (!route) {
            if (!(await allowOfflineRoute(null, pathWithHash))) {
                await restoreAfterOfflineFailure(pathWithHash);
                return;
            }
            window.location.assign(pathWithHash);
            return;
        }
        // If navigating within the same page section (e.g. docs internal
        // pushState) and this wasn't a router-level push, let the page's
        // own popstate handler deal with it (handled by AbortSignal cleanup).
        // `event.state?.routerPage` is set by navigateTo() via history.pushState,
        // so its presence means the router itself triggered this history entry and
        // must handle the transition even if the base path hasn't changed.
        if (route.base === _currentBase && !event.state?.routerPage) return;
        const targetIndex = event.state?.routerIndex;
        const bypassGuard = _guardBypassPath === pathWithHash;
        if (bypassGuard) _guardBypassPath = null;
        const resume = () => {
            if (
                Number.isInteger(targetIndex) &&
                targetIndex !== _historyIndex
            ) {
                _guardBypassPath = pathWithHash;
                history.go(targetIndex - _historyIndex);
                return;
            }
            return navigateTo(pathWithHash, { bypassGuard: true });
        };
        if (!bypassGuard && !requestRouteNavigation(pathWithHash, resume)) {
            if (
                Number.isInteger(targetIndex) &&
                targetIndex !== _historyIndex
            ) {
                _restoringHistory = true;
                history.go(_historyIndex - targetIndex);
            } else {
                history.pushState(
                    { routerPage: _committedPath, routerIndex: _historyIndex },
                    "",
                    _committedPath,
                );
            }
            return;
        }
        if (Number.isInteger(event.state?.routerIndex)) {
            _historyIndex = event.state.routerIndex;
        }
        _committedPath = pathWithHash;
        if (!(await loadRoute(pathWithHash)) && isOffline())
            await restoreAfterOfflineFailure(pathWithHash);
    });
}

function internalNavigationPath(href) {
    if (!href || href.startsWith("#")) return null;
    let destination;
    try {
        destination = new URL(href, window.location.href);
    } catch {
        return null;
    }
    if (
        destination.origin !== window.location.origin ||
        !["http:", "https:"].includes(destination.protocol) ||
        destination.username ||
        destination.password
    )
        return null;
    return destination.pathname + destination.search + destination.hash;
}

function installOfflineNavigation() {
    let pending = false;
    let updateRequested = false;
    const update = async () => {
        if (pending) {
            updateRequested = true;
            return;
        }
        pending = true;
        try {
            const routes = await loadAllRoutes();
            for (const link of document.querySelectorAll(
                "a[href], button[data-navigation-path], [data-online-only]",
            )) {
                const onlineOnly = link.hasAttribute("data-online-only");
                const path = internalNavigationPath(
                    link.getAttribute("href") ?? link.dataset.navigationPath,
                );
                if (path === null && !onlineOnly) continue;
                const disabled =
                    isOffline() &&
                    (onlineOnly ||
                        !offlineRouteAvailable(
                            findMatchingRoute(routes, path),
                            path,
                        ));
                if (disabled && !link.dataset.offlineDisabled) {
                    link.setAttribute("aria-disabled", "true");
                    link.dataset.offlineDisabled = "true";
                    if (link.tagName === "BUTTON") {
                        link.dataset.offlineWasDisabled = String(link.disabled);
                        link.disabled = true;
                    }
                } else if (!disabled && link.dataset.offlineDisabled) {
                    link.removeAttribute("aria-disabled");
                    delete link.dataset.offlineDisabled;
                    if (link.tagName === "BUTTON") {
                        link.disabled =
                            link.dataset.offlineWasDisabled === "true";
                        delete link.dataset.offlineWasDisabled;
                    }
                }
            }
        } finally {
            pending = false;
            if (updateRequested) {
                updateRequested = false;
                void update();
            }
        }
    };
    const transition = async () => {
        await update();
        if (!isOffline()) return;
        const path = getCurrentRoutePath();
        const route = await resolveRoute(path);
        if (!isOffline() || path !== getCurrentRoutePath()) return;
        if (await allowOfflineRoute(route, path)) return;
        ++_navigationSequence;
        _mountController?.abort();
        window.dispatchEvent(new CustomEvent("cognis:route-will-change"));
        await restoreAfterOfflineFailure(path, {
            notify: false,
            fallback: (isCurrent) =>
                showOfflineUnavailable(resolveRouterRoot(), isCurrent),
        });
    };
    window.addEventListener("cognis:offline-data-changed", () => void update());
    window.addEventListener(
        "cognis:offline-routes-prepared",
        () => void update(),
    );
    for (const type of [
        "cognis:connectivity-changed",
        "cognis:offline-policy-changed",
    ])
        window.addEventListener(type, () => {
            void transition().catch((error) =>
                console.error("[offline] page transition failed", {
                    operation: "recoverActivePage",
                    errorName: error?.name,
                }),
            );
        });
    if (typeof MutationObserver !== "undefined")
        new MutationObserver(() => {
            if (isOffline()) void update();
        }).observe(document.body, { childList: true, subtree: true });
    void update();
}
