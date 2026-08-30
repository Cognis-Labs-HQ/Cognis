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
    "modules",
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

const SPA_PAGE_ENTRY_FILES = [
    "src/adapters/social/messages/ui/app.js",
    "src/adapters/social/profile/ui/app.js",
    "src/adapters/study/classes/ui/app.js",
    "src/adapters/study/classes/ui/my-classes.js",
    "src/gateways/auth/ui/register.js",
    "src/gateways/calendar/ui/app.js",
    "src/gateways/share/ui/app/index.js",
    "src/gateways/share/ui/app/account-share/index.js",
    "src/gateways/share/ui/app/shares/index.js",
    "src/gateways/study/ui/study.js",
    ...[
        "administration",
        "changelogs",
        "dashboard",
        "docs",
        "error",
        "invite",
        "license",
        "login",
        "modules",
        "settings",
        "users",
    ].map((page) => `src/ui/app/${page}/index.js`),
];

test("every SPA page entry uses the shared direct-mount lifecycle", () => {
    for (const entryFile of SPA_PAGE_ENTRY_FILES) {
        const source = readFileSync(resolve(ROOT, entryFile), "utf8");
        assert.match(
            source,
            /\bmountWhenDirect\b/,
            `${entryFile} must import the shared direct-mount lifecycle`,
        );
        assert.match(
            source,
            /await mountWhenDirect\(mount\)/,
            `${entryFile} must guard its direct browser mount`,
        );
        assert.doesNotMatch(
            source,
            /await mount\(document\.querySelector/,
            `${entryFile} must not mount unconditionally at module evaluation`,
        );
    }
});

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
            /import\s+\{[^}]*\bmountWhenDirect\b[^}]*\}\s+from\s+["']\.\.\/\.\.\/reuse\/page-entry\.js["'];/,
            `${page}/index.js must import mountWhenDirect for direct URL access`,
        );
        assert.match(
            src,
            /await mountWhenDirect\(mount\)/,
            `${page}/index.js must call mountWhenDirect(mount) for direct URL access`,
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
    assert.match(
        src,
        /capabilities\.contribute\([\s\S]*"router:invalidateRoutes",[\s\S]*invalidateSpaRouteCache/,
        "app-router.js must expose route invalidation through uiCtx",
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

test("route invalidation prevents in-flight anonymous loads from restoring stale routes", () => {
    const routerSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    const registrySource = readFileSync(
        resolve(ROOT, "src/ui/reuse/spa-route-registry.js"),
        "utf8",
    );

    assert.match(routerSource, /loadGeneration === _routeCacheGeneration/);
    assert.match(routerSource, /_routeCacheGeneration \+= 1/);
    assert.match(registrySource, /loadGeneration === cacheGeneration/);
    assert.match(registrySource, /cacheGeneration \+= 1/);
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

test("router rechecks navigation freshness after authentication", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    const authentication = src.indexOf(
        'await uiCtx.runFlow("authenticate-session"',
    );
    const freshnessCheck = src.indexOf(
        "signal.aborted || navigationSequence !== _navigationSequence",
        authentication,
    );
    const sessionProcessing = src.indexOf("const session =", authentication);
    assert.ok(authentication >= 0);
    assert.ok(freshnessCheck > authentication);
    assert.ok(freshnessCheck < sessionProcessing);
});

test("router resets page actions and removes stale styles before mounting", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(src, /capabilities\.get\("page:actions"\)\?\.reset/);
    assert.match(src, /preparePageStylesheets\(/);
    assert.ok(
        src.indexOf("commitPageStylesheets()") < src.indexOf("await mod.mount"),
        "stale styles must not influence destination page layout calculations",
    );
    assert.ok(
        src.indexOf('routeRoot.removeAttribute("class")') <
            src.indexOf("await mod.mount"),
        "route-owned root classes must not survive into the destination page",
    );
});

test("SPA route bundles match structured-content styles from direct loads", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        src,
        /settings:[\s\S]*structured-content\.css[\s\S]*settings\.css/,
    );
    assert.match(
        src,
        /pattern: \/\^\\\/administration\/[\s\S]*structured-content\.css/,
    );
});

test("router guards against re-initialisation while refreshing its root", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        src,
        /_initialized/,
        "app-router.js must guard initRouter against being called twice",
    );
    assert.match(
        src,
        /if \(root\) _root = root;\s*if \(_initialized\) return;/,
        "app-router.js must keep the router root fresh across shell reuse",
    );
});

test("router resolves #app before mounting routes", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );

    assert.match(src, /function resolveRouterRoot\(\)/);
    assert.match(src, /_root = document\.querySelector\(["']#app["']\);/);
    assert.match(src, /const routeRoot = resolveRouterRoot\(\);/);
    assert.match(
        src,
        /await mod\.mount\(routeRoot, \{[\s\S]*signal,[\s\S]*shareContext:/,
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

test("dashboard layout resumes deferred login setup after rendering", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(source, /keyring:hasDeferredSetup/);
    assert.match(source, /uiCtx\.runFlow\("complete-login", \{\}\)/);
    assert.match(source, /scheduleDeferredLoginSetup\(i18n\)/);
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
    assert.match(
        src,
        /finally\s*\{[\s\S]*finishPageLoading\(\)/m,
        "app-router.js must call finishPageLoading() from a finally block",
    );
    assert.match(
        src,
        /openRuntimeErrorPopup\(/,
        "app-router.js must surface runtime route failures via the shared error popup",
    );
});

test("router passes resolved share context to destination pages", () => {
    const routerSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        routerSource,
        /shareContext:\s*session\?\.shareContext \?\? null/,
    );
});

test("router loads destination flow hooks before authenticating an SPA route", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    const loadRouteStart = source.indexOf("async function loadRoute(path)");
    const routeModuleLoad = source.indexOf(
        "mod = await loadWithSpaImportGuard(() => route.load(path))",
        loadRouteStart,
    );
    const authentication = source.indexOf(
        'uiCtx.runFlow("authenticate-session",',
        loadRouteStart,
    );

    assert.ok(loadRouteStart >= 0, "router must define loadRoute");
    assert.ok(routeModuleLoad >= 0, "router must load the destination module");
    assert.ok(authentication >= 0, "router must authenticate the navigation");
    assert.ok(
        routeModuleLoad < authentication,
        "destination modules must register their gateway flow hooks before authentication",
    );
});

test("router authenticates against the requested route instead of mutable location state", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        source,
        /runFlow\("authenticate-session", \{\s*routePath: path,\s*\}\)/,
    );
});

test("router delegates auth enforcement to the authenticate-session flow", () => {
    const routerSrc = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        routerSrc,
        /authenticate-session/,
        "app-router.js must run the authenticate-session flow to enforce auth before route mounts",
    );
    const hooksSrc = readFileSync(
        resolve(ROOT, "src/gateways/auth/ui/session-flow-hooks.js"),
        "utf8",
    );
    assert.match(
        hooksSrc,
        /\/settings#security/,
        "auth session-flow-hooks.js must redirect users who require TFA setup to /settings#security",
    );
});

test("router installs global runtime error handlers", () => {
    const src = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        src,
        /installRuntimeErrorHandlers\(\)/,
        "app-router.js must initialize global runtime error listeners",
    );
});

test("router mounts the native error page without account authentication", () => {
    const routerSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );
    assert.match(
        routerSource,
        /pattern:\s*\/\^\\\/error\$\/[\s\S]*public:\s*true/,
    );
    assert.match(
        routerSource,
        /const authResult = route\.public[\s\S]*\? null[\s\S]*runFlow\("authenticate-session"/,
    );
});

test("navbar avatar refresh preserves a resolved image during SPA plugin loading", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    const profileNavbarSource = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/navbar.js"),
        "utf8",
    );

    assert.match(
        source,
        /uiCtx\.capabilities\.get\("ui:navbarAvatarProvider"\)/,
    );
    assert.match(
        source,
        /if \(!avatarProvider && avatarBtn\.querySelector\("\.avatar-image"\)\) return/,
    );
    assert.match(
        profileNavbarSource,
        /uiCtx\.capabilities\.contribute\("ui:navbarAvatarProvider"/,
    );
    assert.doesNotMatch(profileNavbarSource, /registerAvatarProvider/);
});

test("direct SPA entry loads capability providers before the route module", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/spa-page-entry.js"),
        "utf8",
    );
    const providerImport = source.indexOf(
        "await Promise.all(capabilityScripts.map",
    );
    const routeImport = source.indexOf("await import(config.scriptUrl)");

    assert.ok(providerImport >= 0);
    assert.ok(routeImport > providerImport);
});
