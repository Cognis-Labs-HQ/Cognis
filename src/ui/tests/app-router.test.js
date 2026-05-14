import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const DASHBOARD_PAGES = [
    "dashboard",
    "settings",
    "modules",
    "users",
    "invite",
    "administration",
    "docs",
    "license",
];

const ADAPTER_BACKED_SPA_ROUTES = [
    {
        path: "/messages",
        scriptUrl: "/static/adapters/social/messages/app.js",
    },
    {
        path: "/profile",
        scriptUrl: "/static/adapters/social/profile/app.js",
    },
    {
        path: "/classes",
        scriptUrl: "/static/adapters/study/classes/app.js",
    },
    {
        path: "/my-classes",
        scriptUrl: "/static/adapters/study/classes/my-classes.js",
    },
];

test("all dashboard pages export an async mount function", () => {
    for (const page of DASHBOARD_PAGES) {
        const src = readFileSync(
            resolve(ROOT, `src/ui/app/${page}/index.js`),
            "utf8",
        );
        assert.match(
            src,
            /export async function mount\(/,
            `${page}/index.js must export an async mount() function`,
        );
    }
});

test("all dashboard pages call mount on direct browser load", () => {
    for (const page of DASHBOARD_PAGES) {
        const src = readFileSync(
            resolve(ROOT, `src/ui/app/${page}/index.js`),
            "utf8",
        );
        assert.match(
            src,
            /await mount\(document\.querySelector\(["']#app["']\)\)/,
            `${page}/index.js must call mount(document.querySelector('#app')) for direct URL access`,
        );
    }
});

test("router exports initRouter, navigateTo and getCurrentBase", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        src,
        /export function initRouter\(/,
        "app-router.js must export initRouter",
    );
    assert.match(
        src,
        /export async function navigateTo\(/,
        "app-router.js must export navigateTo",
    );
    assert.match(
        src,
        /export function getCurrentBase\(/,
        "app-router.js must export getCurrentBase",
    );
});

test("router registers routes for all dashboard pages", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    for (const page of DASHBOARD_PAGES) {
        assert.ok(
            src.includes(`/app/${page}/index.js`),
            `app-router.js must register a route for ${page}`,
        );
    }
});

test("router registers adapter-backed SPA routes for internal shell pages", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    for (const route of ADAPTER_BACKED_SPA_ROUTES) {
        assert.ok(
            src.includes(route.path),
            `app-router.js must register a route pattern for ${route.path}`,
        );
        assert.ok(
            src.includes(route.scriptUrl),
            `app-router.js must load ${route.scriptUrl} for ${route.path}`,
        );
    }
});

test("router uses history.pushState for navigation", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        src,
        /history\.pushState\(/,
        "app-router.js must use history.pushState for SPA navigation",
    );
});

test("router guards against re-initialisation", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        src,
        /_initialized/,
        "app-router.js must guard initRouter against being called twice",
    );
});

test("dashboard-layout initialises the router after shell setup", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(
        src,
        /import.*initRouter.*from/,
        "dashboard-layout.js must import initRouter",
    );
    assert.match(
        src,
        /initRouter\(root\)/,
        "dashboard-layout.js must call initRouter(root)",
    );
    assert.doesNotMatch(
        src,
        /await loadNavbarPlugins\(\)/,
        "dashboard-layout.js must not block initial shell render on navbar plugin loading",
    );
    assert.match(
        src,
        /scheduleNavbarEnhancements\(\)/,
        "dashboard-layout.js must defer navbar enhancements until after the shell renders",
    );
});

test("docs page uses signal to clean up its popstate listener", () => {
    const src = readFileSync(resolve(ROOT, "src/ui/app/docs/index.js"), "utf8");

    // Verify the source contains a window.addEventListener("popstate", ...)
    // call that includes { signal } as its options object, allowing for any
    // handler body between the event name and the options. The trailing-comma
    // variant `{ signal },\n)` is explicitly tolerated.
    assert.match(
        src,
        /window\.addEventListener\(\s*["']popstate["'][\s\S]*?\{\s*signal\s*\},?\s*\)/m,
        "docs/index.js must pass { signal } to its window popstate listener",
    );
});

test("administration page uses signal to clean up its beforeunload listener", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/app/administration/index.js"),
        "utf8",
    );

    // Verify the source contains a window.addEventListener("beforeunload", ...)
    // call that includes { signal } as its options object, allowing for any
    // handler body between the event name and the options. The trailing-comma
    // variant `{ signal },\n)` is explicitly tolerated.
    assert.match(
        src,
        /window\.addEventListener\(\s*["']beforeunload["'][\s\S]*?\{\s*signal\s*\},?\s*\)/m,
        "administration/index.js must pass { signal } to its window beforeunload listener",
    );
});

test("router aborts the previous mount's signal on navigation", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        src,
        /_mountController\.abort\(\)/,
        "app-router.js must abort the previous AbortController on navigation",
    );
    assert.match(
        src,
        /new AbortController\(\)/,
        "app-router.js must create a new AbortController for each mount",
    );
});
