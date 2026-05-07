import test from "node:test";
import assert from "node:assert/strict";
import { createUiRoutes } from "../../routes/ui/index.js";
import path from "node:path";
import { issueAccessToken } from "../../auth/access-tokens.js";

function createResponseRecorder() {
    let status = 0;
    let headers: Record<string, string> = {};
    const chunks: string[] = [];
    return {
        res: {
            setHeader() {},
            writeHead(code: number, nextHeaders: Record<string, string>) {
                status = code;
                headers = nextHeaders ?? {};
            },
            end(body?: string | Buffer) {
                if (body) chunks.push(body.toString());
            },
        },
        get status() {
            return status;
        },
        get headers() {
            return headers;
        },
        get body() {
            return chunks.join("");
        },
    };
}

test("ui routes redirect root to dashboard", async () => {
    const route = createUiRoutes();
    const recorder = createResponseRecorder();

    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/"),
    );

    assert.equal(handled, true);
    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/dashboard");
});

test("dashboard route requires login cookie", async () => {
    const route = createUiRoutes();
    const anonymous = createResponseRecorder();

    await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/dashboard"),
    );

    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.location, "/login");

    const token = issueAccessToken("u1", "user", 60);
    const authed = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        authed.res as any,
        new URL("http://localhost/dashboard"),
    );

    assert.equal(authed.status, 200);
    assert.match(authed.body, /static\/app\/dashboard\/index\.js/);
});

test("login page is served as standalone page html", async () => {
    const route = createUiRoutes();
    const recorder = createResponseRecorder();

    await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/login"),
    );

    assert.equal(recorder.status, 200);
    assert.match(recorder.body, /id="login-form"/);
    assert.match(recorder.body, /id="theme-toggle"/);
    assert.match(recorder.body, /app\/login\/index\.js/);
});

test("ui static route serves templates and assets from public folder", async () => {
    const route = createUiRoutes();

    const templateRes = createResponseRecorder();
    await route(
        { headers: {} } as any,
        templateRes.res as any,
        new URL("http://localhost/static/templates/dashboard-layout.html"),
    );
    assert.equal(templateRes.status, 200);
    assert.match(templateRes.body, /topbar-icon/);

    const assetRes = createResponseRecorder();
    await route(
        { headers: {} } as any,
        assetRes.res as any,
        new URL("http://localhost/static/assets/icons/cognis-icon.png"),
    );
    assert.equal(assetRes.status, 200);
    assert.equal(assetRes.headers["content-type"], "image/png");
});

test("modules page requires login and serves html when authenticated", async () => {
    const route = createUiRoutes();
    const anonymous = createResponseRecorder();
    await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/modules"),
    );
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.location, "/login");

    const userToken = issueAccessToken("u1", "user", 60);
    const nonAdmin = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${userToken}` } } as any,
        nonAdmin.res as any,
        new URL("http://localhost/modules"),
    );
    assert.equal(nonAdmin.status, 302);
    assert.equal(nonAdmin.headers.location, "/dashboard");

    const token = issueAccessToken("u1", "admin", 60);
    const authed = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        authed.res as any,
        new URL("http://localhost/modules"),
    );
    assert.equal(authed.status, 302);
    assert.equal(authed.headers.location, "/administration");
});

test("module ui routes can be published outside /modules prefix", async () => {
    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "sample-analytics",
                entrypoints: { ui: "./ui/pages/analytics.html" },
            },
        ],
    } as any);
    const token = issueAccessToken("u1", "admin", 60);
    const recorder = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        recorder.res as any,
        new URL("http://localhost/analytics"),
    );
    assert.equal(recorder.status, 200);
    assert.match(recorder.body, /Sample Analytics Module/);
});

test("administration page is visible to admins only", async () => {
    const route = createUiRoutes();

    const anonymous = createResponseRecorder();
    await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/administration"),
    );
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.location, "/login");

    const userToken = issueAccessToken("u1", "user", 60);
    const userRes = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${userToken}` } } as any,
        userRes.res as any,
        new URL("http://localhost/administration"),
    );
    assert.equal(userRes.status, 302);
    assert.equal(userRes.headers.location, "/dashboard");

    const adminToken = issueAccessToken("u1", "admin", 60);
    const adminRes = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${adminToken}` } } as any,
        adminRes.res as any,
        new URL("http://localhost/administration"),
    );
    assert.equal(adminRes.status, 200);
    assert.match(adminRes.body, /static\/app\/administration\/index\.js/);
    assert.match(adminRes.body, /id="app"/);
});

test("users page is visible to admins only", async () => {
    const route = createUiRoutes();
    const anonymous = createResponseRecorder();
    await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/users"),
    );
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.location, "/login");

    const userToken = issueAccessToken("u1", "user", 60);
    const userRes = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${userToken}` } } as any,
        userRes.res as any,
        new URL("http://localhost/users"),
    );
    assert.equal(userRes.status, 302);
    assert.equal(userRes.headers.location, "/dashboard");

    const adminToken = issueAccessToken("u1", "admin", 60);
    const adminRes = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${adminToken}` } } as any,
        adminRes.res as any,
        new URL("http://localhost/users"),
    );
    assert.equal(adminRes.status, 200);
    assert.match(adminRes.body, /static\/app\/users\/index\.js/);
});

test("invite page redirects non-founder admins to /users", async () => {
    const route = createUiRoutes(undefined, undefined, {
        async isFounder() {
            return false;
        },
    } as any);
    const adminToken = issueAccessToken("u1", "admin", 60);
    const res = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${adminToken}` } } as any,
        res.res as any,
        new URL("http://localhost/invite"),
    );
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, "/users");
});

test("invite page is visible to founder admins", async () => {
    const route = createUiRoutes(undefined, undefined, {
        async isFounder() {
            return true;
        },
    } as any);
    const adminToken = issueAccessToken("u1", "admin", 60);
    const res = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${adminToken}` } } as any,
        res.res as any,
        new URL("http://localhost/invite"),
    );
    assert.equal(res.status, 200);
    assert.match(res.body, /static\/app\/invite\/index\.js/);
});

test("core ui routes do not serve /profile (owned by profile gateway)", async () => {
    const route = createUiRoutes();

    const anonymous = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/profile/u1"),
    );
    assert.equal(
        handled,
        false,
        "/profile route should not be handled by core UI routes",
    );
});

test("license route requires login cookie and serves dedicated page", async () => {
    const route = createUiRoutes();
    const anonymous = createResponseRecorder();
    await route(
        { headers: {} } as any,
        anonymous.res as any,
        new URL("http://localhost/license"),
    );
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.location, "/login");

    const token = issueAccessToken("u1", "user", 60);
    const authed = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        authed.res as any,
        new URL("http://localhost/license"),
    );
    assert.equal(authed.status, 200);
    assert.match(authed.body, /static\/app\/license\/index\.js/);
    assert.match(authed.body, /id="app"/);
});

import { UIRegistry as StaticUIRegistry } from "../../ui-registry.js";
import path from "node:path";

test("GET /static/gateways/:id/:file serves file from registered static dir", async () => {
    const uiRegistry = new StaticUIRegistry();
    const authUiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "auth",
        "ui",
    );
    uiRegistry.registerStaticDir("auth", authUiDir);
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/gateways/auth/admin-section.js"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
    assert.match(recorder.body, /createAdminSection/);
});

test("GET /static/gateways/:id/:file returns 404 when static dir not registered", async () => {
    const uiRegistry = new StaticUIRegistry();
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/gateways/auth/admin-section.js"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 404);
});

test("GET /static/gateways/notify/admin-section.js serves notify gateway admin UI", async () => {
    const uiRegistry = new StaticUIRegistry();
    const notifyUiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "notify",
        "ui",
    );
    uiRegistry.registerStaticDir("notify", notifyUiDir);
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/gateways/notify/admin-section.js"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
    assert.match(recorder.body, /createAdminSection/);
});

test("GET /static/gateways/profile/navbar.js serves profile gateway navbar plugin", async () => {
    const uiRegistry = new StaticUIRegistry();
    const profileUiDir = path.resolve(
        process.cwd(),
        "src",
        "gateways",
        "profile",
        "ui",
    );
    uiRegistry.registerStaticDir("profile", profileUiDir);
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/gateways/profile/navbar.js"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
    assert.match(recorder.body, /registerAvatarProvider/);
});

test("GET /api/v1/ui/navbar-plugins returns registered navbar plugins for authenticated user", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/static/gateways/profile/navbar.js",
    });
    const route = createUiRoutes(undefined, uiRegistry);

    const userToken = issueAccessToken("u1", "user", 60);
    const recorder = createResponseRecorder();
    const handled = await route(
        {
            method: "GET",
            headers: {
                cookie: `cognis_access_token=${userToken}`,
                authorization: `Bearer ${userToken}`,
            },
        } as any,
        recorder.res as any,
        new URL("http://localhost/api/v1/ui/navbar-plugins"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    const payload = JSON.parse(recorder.body);
    assert.equal(payload.data.length, 1);
    assert.equal(
        payload.data[0].scriptUrl,
        "/static/gateways/profile/navbar.js",
    );
});

test("GET /api/v1/ui/navbar-plugins returns 401 for unauthenticated request", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/static/gateways/profile/navbar.js",
    });
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    await route(
        { method: "GET", headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/api/v1/ui/navbar-plugins"),
    );

    assert.equal(recorder.status, 401);
});
