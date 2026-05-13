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
        pattern: /^\/study/,
        base: "/study",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/gateways/study/study.css",
        ],
        load: () => import("/static/gateways/study/study.js"),
    },
];

function findRoute(path) {
    return ROUTES.find((r) => r.pattern.test(path));
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
        mod = await route.load();
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
    history.pushState({ routerPage: path }, "", path);
    await loadRoute(path);
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
