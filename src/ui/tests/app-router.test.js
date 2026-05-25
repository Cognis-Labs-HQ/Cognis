import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const DASHBOARD_PAGES = [
    "dashboard",
    "settings",
    "users",
    "invite",
    "administration",
    "docs",
    "changelogs",
    "license",
];

const ADAPTER_BACKED_SPA_ROUTES = [
    {
        id: "social-messages-page",
        sourceFile: "src/adapters/social/messages/index.ts",
        scriptUrl: "/static/adapters/social/messages/app.js",
    },
    {
        id: "social-profile-page",
        sourceFile: "src/adapters/social/profile/index.ts",
        scriptUrl: "/static/adapters/social/profile/app.js",
    },
    {
        id: "study-classes-teacher-page",
        sourceFile: "src/adapters/study/classes/index.ts",
        scriptUrl: "/static/adapters/study/classes/app.js",
    },
    {
        id: "study-classes-student-page",
        sourceFile: "src/adapters/study/classes/index.ts",
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
            /import\s+\{\s*mountWhenDirect\s*\}\s+from\s+["']\.\.\/\.\.\/reuse\/page-entry\.js["'];/,
            `${page}/index.js must import mountWhenDirect for direct URL access`,
        );
        assert.match(
            src,
            /await mountWhenDirect\(mount\)/,
            `${page}/index.js must call mountWhenDirect(mount) for direct URL access`,
        );
        assert.doesNotMatch(
            src,
            /if \(!globalThis\.__spaRouter\)/,
            `${page}/index.js must not use the deprecated manual __spaRouter guard`,
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

test("router loads adapter-backed SPA routes from the UI app-routes API", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        src,
        /loadSpaRoutes/,
        "app-router.js must load dynamic SPA routes from the route registry",
    );
    assert.ok(
        src.includes("/api/v1/ui/app-routes") ||
            readFileSync(
                resolve(ROOT, "src/ui/reuse/spa-route-registry.js"),
                "utf8",
            ).includes("/api/v1/ui/app-routes"),
        "router stack must fetch SPA route metadata from /api/v1/ui/app-routes",
    );
});

test("adapters self-register SPA route metadata for the app router", () => {
    for (const route of ADAPTER_BACKED_SPA_ROUTES) {
        const src = readFileSync(resolve(ROOT, route.sourceFile), "utf8");
        assert.ok(
            src.includes("registerSpaRoute"),
            `${route.sourceFile} must self-register SPA routes`,
        );
        assert.ok(
            src.includes(route.id),
            `${route.sourceFile} must register SPA route id ${route.id}`,
        );
        assert.ok(
            src.includes(route.scriptUrl),
            `${route.sourceFile} must reference ${route.scriptUrl}`,
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
    assert.match(
        src,
        /beginPageLoading\(\)/,
        "app-router.js must show the shared loading overlay during navigation",
    );
    assert.match(
        src,
        /finishPageLoading\(\)/,
        "app-router.js must hide the shared loading overlay after navigation",
    );
});
