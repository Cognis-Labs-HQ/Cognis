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
 * @param {HTMLElement} root — the #app element.
 * @returns {void}
 */

const ROUTES = [
    {
        pattern: /^\/dashboard$/,
        base: "/dashboard",
        load: () => import("../app/dashboard/index.js"),
    },
    {
        pattern: /^\/settings/,
        base: "/settings",
        load: () => import("../app/settings/index.js"),
    },
    {
        pattern: /^\/modules$/,
        base: "/modules",
        load: () => import("../app/modules/index.js"),
    },
    {
        pattern: /^\/users/,
        base: "/users",
        load: () => import("../app/users/index.js"),
    },
    {
        pattern: /^\/profile/,
        base: "/profile",
        load: () => import("../app/profile/index.js"),
    },
    {
        pattern: /^\/administration/,
        base: "/administration",
        load: () => import("../app/administration/index.js"),
    },
    {
        pattern: /^\/docs/,
        base: "/docs",
        load: () => import("../app/docs/index.js"),
    },
    {
        pattern: /^\/license$/,
        base: "/license",
        load: () => import("../app/license/index.js"),
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

    const mod = await route.load();
    // If another navigation started while the module was loading, bail out.
    if (signal.aborted) return false;
    await mod.mount(_root, { signal });
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
    _currentBase =
        "/" + (window.location.pathname.split("/")[1] || "dashboard");

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
        if (route.base === _currentBase && !event.state?.routerPage) return;
        await loadRoute(path);
    });
}
