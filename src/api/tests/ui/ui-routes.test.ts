import test from "node:test";
import assert from "node:assert/strict";
import { createUiRoutes } from "../../routes/ui/index.js";
import path from "node:path";
import {
    issueAccessToken,
    lookupAccessToken,
    revokeAccessTokensForSubject,
} from "../../../gateways/auth/access-tokens.js";

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

test("dashboard route redirects missing-account sessions with account_deleted reason", async () => {
    const token = issueAccessToken("missing-user", "user", 60);
    const route = createUiRoutes(undefined, undefined, {
        async getInfo() {
            return null;
        },
    } as any);
    const recorder = createResponseRecorder();

    await route(
        {
            headers: { cookie: `cognis_access_token=${token}` },
        } as any,
        recorder.res as any,
        new URL("http://localhost/dashboard"),
    );

    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/login?reason=account_deleted");
});

test("dashboard route redirects revoked disabled-account sessions with account_disabled reason", async () => {
    const disabledToken = issueAccessToken("disabled-user", "user", 60);
    revokeAccessTokensForSubject("disabled-user");
    const route = createUiRoutes(undefined, undefined, {
        async getInfo(username: string) {
            if (username !== "disabled-user") return null;
            return { enabled: false };
        },
    } as any);
    const recorder = createResponseRecorder();

    await route(
        {
            headers: { cookie: `cognis_access_token=${disabledToken}` },
        } as any,
        recorder.res as any,
        new URL("http://localhost/dashboard"),
    );

    assert.equal(recorder.status, 302);
    assert.equal(recorder.headers.location, "/login?reason=account_disabled");
});

test("login page serves html for authenticated sessions", async () => {
    const route = createUiRoutes();
    const token = issueAccessToken("u1", "user", 60);
    const recorder = createResponseRecorder();

    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        recorder.res as any,
        new URL("http://localhost/login"),
    );

    assert.equal(recorder.status, 200);
    assert.match(recorder.body, /id="app"/);
    assert.match(recorder.body, /app\/login\/index\.js/);
});

test("login page serves html for revoked cookie tokens", async () => {
    const route = createUiRoutes();
    const token = issueAccessToken("u2", "user", 60);
    revokeAccessTokensForSubject("u2");
    assert.equal(lookupAccessToken(token)?.revoked, true);
    const recorder = createResponseRecorder();

    await route(
        { headers: { cookie: `cognis_access_token=${token}` } } as any,
        recorder.res as any,
        new URL("http://localhost/login"),
    );

    assert.equal(recorder.status, 200);
    assert.match(recorder.body, /id="app"/);
    assert.match(recorder.body, /app\/login\/index\.js/);
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
    assert.match(recorder.body, /id="app"/);
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

test("ui routes serve public assets directly from /assets", async () => {
    const route = createUiRoutes();

    const assetRes = createResponseRecorder();
    await route(
        { headers: {} } as any,
        assetRes.res as any,
        new URL("http://localhost/assets/icons/cognis-icon.png"),
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

test("module ui routes honor role access policies declared in routes.json", async () => {
    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "sample-analytics",
                entrypoints: { ui: "./ui/pages/analytics.html" },
            },
        ],
    } as any);
    const userToken = issueAccessToken("u1", "user", 60);
    const userRecorder = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${userToken}` } } as any,
        userRecorder.res as any,
        new URL("http://localhost/analytics"),
    );
    assert.equal(userRecorder.status, 302);
    assert.equal(userRecorder.headers.location, "/dashboard");

    const ownerToken = issueAccessToken("u1", "owner", 60);
    const ownerRecorder = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${ownerToken}` } } as any,
        ownerRecorder.res as any,
        new URL("http://localhost/analytics"),
    );
    assert.equal(ownerRecorder.status, 200);
    assert.match(ownerRecorder.body, /Sample Analytics Module/);
});

test("module ui routes fail closed on invalid role access policies in routes.json", async () => {
    const route = createUiRoutes({
        listManifests: async () => [
            {
                id: "sample-analytics-invalid-policy",
                entrypoints: { ui: "./ui/pages/analytics.html" },
            },
        ],
    } as any);
    const ownerToken = issueAccessToken("u1", "owner", 60);
    const ownerRecorder = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${ownerToken}` } } as any,
        ownerRecorder.res as any,
        new URL("http://localhost/analytics-invalid-policy"),
    );
    assert.equal(ownerRecorder.status, 302);
    assert.equal(ownerRecorder.headers.location, "/dashboard");
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

test("invite page redirects admins to /users", async () => {
    const route = createUiRoutes(
        undefined,
        undefined,
        {
            async isFounder() {
                return true;
            },
        } as any,
        {
            get() {
                return { status: "active" };
            },
        } as any,
    );
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

test("invite page is visible to non-admin founders", async () => {
    const route = createUiRoutes(
        undefined,
        undefined,
        {
            async isFounder() {
                return true;
            },
        } as any,
        {
            get() {
                return { status: "active" };
            },
        } as any,
    );
    const founderToken = issueAccessToken("u1", "user", 60);
    const res = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${founderToken}` } } as any,
        res.res as any,
        new URL("http://localhost/invite"),
    );
    assert.equal(res.status, 200);
    assert.match(res.body, /static\/app\/invite\/index\.js/);
});

test("invite page redirects founders to /dashboard when registration gateway is disabled", async () => {
    const route = createUiRoutes(
        undefined,
        undefined,
        {
            async isFounder() {
                return true;
            },
        } as any,
        {
            get() {
                return { status: "disabled" };
            },
        } as any,
    );
    const founderToken = issueAccessToken("u1", "user", 60);
    const res = createResponseRecorder();
    await route(
        { headers: { cookie: `cognis_access_token=${founderToken}` } } as any,
        res.res as any,
        new URL("http://localhost/invite"),
    );
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, "/dashboard");
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

test("GET /static/adapters/social/profile/navbar.js serves profile adapter navbar plugin", async () => {
    const uiRegistry = new StaticUIRegistry();
    const profileUiDir = path.resolve(
        process.cwd(),
        "src",
        "adapters",
        "social",
        "profile",
        "ui",
    );
    uiRegistry.registerAdapterStaticDir("social", "profile", profileUiDir);
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/adapters/social/profile/navbar.js"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
    assert.match(recorder.body, /registerAvatarProvider/);
});

test("GET /static/modules/study/languages/ja/components/hiragana-alphabet/ui/app.js serves module assets", async () => {
    const uiRegistry = new StaticUIRegistry();
    const hiraganaUiDir = path.resolve(
        process.cwd(),
        "src",
        "modules",
        "study",
        "languages",
        "ja",
        "components",
        "hiragana-alphabet",
        "ui",
    );
    uiRegistry.registerModuleStaticDir(
        "study/languages/ja/components/hiragana-alphabet/ui",
        hiraganaUiDir,
    );
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL(
            "http://localhost/static/modules/study/languages/ja/components/hiragana-alphabet/ui/app.js",
        ),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
});

test("GET /static/modules/unknown/file.js returns 404 for unregistered module prefix", async () => {
    const uiRegistry = new StaticUIRegistry();
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/modules/unknown/file.js"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 404);
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

test("GET /api/v1/ui/page-extensions/:pageId filters extensions by access policy", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerPageExtension("dashboard", {
        id: "public",
        label: "Public",
        scriptUrl: "/static/gateways/public/dashboard.js",
    });
    uiRegistry.registerPageExtension("dashboard", {
        id: "moderator",
        label: "Moderator",
        scriptUrl: "/static/gateways/moderator/dashboard.js",
        access: { minRole: "moderator" },
    });
    uiRegistry.registerPageExtension("dashboard", {
        id: "owner",
        label: "Owner",
        scriptUrl: "/static/gateways/owner/dashboard.js",
        access: { onlyRole: "owner" },
    });
    const route = createUiRoutes(undefined, uiRegistry);

    const adminToken = issueAccessToken("u1", "admin", 60);
    const adminRecorder = createResponseRecorder();
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
        } as any,
        adminRecorder.res as any,
        new URL("http://localhost/api/v1/ui/page-extensions/dashboard"),
    );
    const adminPayload = JSON.parse(adminRecorder.body);
    assert.deepEqual(
        adminPayload.data.map((entry: { id: string }) => entry.id),
        ["public", "moderator"],
    );

    const ownerToken = issueAccessToken("u2", "owner", 60);
    const ownerRecorder = createResponseRecorder();
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${ownerToken}` },
        } as any,
        ownerRecorder.res as any,
        new URL("http://localhost/api/v1/ui/page-extensions/dashboard"),
    );
    const ownerPayload = JSON.parse(ownerRecorder.body);
    assert.deepEqual(
        ownerPayload.data.map((entry: { id: string }) => entry.id),
        ["public", "moderator", "owner"],
    );
});

test("GET /api/v1/ui/navbar-plugins filters disabled navbar plugins", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/static/gateways/enabled/navbar.js",
        isEnabled: () => true,
    });
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/static/gateways/disabled/navbar.js",
        isEnabled: () => false,
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
    assert.deepEqual(
        payload.data.map((plugin: { scriptUrl: string }) => plugin.scriptUrl),
        ["/static/gateways/enabled/navbar.js"],
    );
});

test("GET /api/v1/ui/navbar-plugins filters plugins by access policy", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/static/gateways/user/navbar.js",
    });
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/static/gateways/admin/navbar.js",
        access: { minRole: "admin" },
    });
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/static/gateways/owner/navbar.js",
        access: { onlyRole: "owner" },
    });
    const route = createUiRoutes(undefined, uiRegistry);

    const adminToken = issueAccessToken("u1", "admin", 60);
    const adminRecorder = createResponseRecorder();
    await route(
        {
            method: "GET",
            headers: {
                cookie: `cognis_access_token=${adminToken}`,
                authorization: `Bearer ${adminToken}`,
            },
        } as any,
        adminRecorder.res as any,
        new URL("http://localhost/api/v1/ui/navbar-plugins"),
    );
    const adminPayload = JSON.parse(adminRecorder.body);
    assert.deepEqual(
        adminPayload.data.map(
            (plugin: { scriptUrl: string }) => plugin.scriptUrl,
        ),
        ["/static/gateways/user/navbar.js", "/static/gateways/admin/navbar.js"],
    );

    const ownerToken = issueAccessToken("u2", "owner", 60);
    const ownerRecorder = createResponseRecorder();
    await route(
        {
            method: "GET",
            headers: {
                cookie: `cognis_access_token=${ownerToken}`,
                authorization: `Bearer ${ownerToken}`,
            },
        } as any,
        ownerRecorder.res as any,
        new URL("http://localhost/api/v1/ui/navbar-plugins"),
    );
    const ownerPayload = JSON.parse(ownerRecorder.body);
    assert.deepEqual(
        ownerPayload.data.map(
            (plugin: { scriptUrl: string }) => plugin.scriptUrl,
        ),
        [
            "/static/gateways/user/navbar.js",
            "/static/gateways/admin/navbar.js",
            "/static/gateways/owner/navbar.js",
        ],
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

test("GET /api/v1/ui/settings-sections returns registered sections for authenticated user", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerSettingsSection({
        id: "study",
        label: "Study",
        scriptUrl: "/static/gateways/study/study-prefs.js",
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
        new URL("http://localhost/api/v1/ui/settings-sections"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    const payload = JSON.parse(recorder.body);
    assert.equal(payload.data.length, 1);
    assert.equal(payload.data[0].id, "study");
});

test("GET /api/v1/ui/settings-sections filters disabled settings sections", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerSettingsSection({
        id: "enabled-section",
        label: "Enabled",
        scriptUrl: "/static/gateways/enabled/prefs.js",
        isEnabled: () => true,
    });
    uiRegistry.registerSettingsSection({
        id: "disabled-section",
        label: "Disabled",
        scriptUrl: "/static/gateways/disabled/prefs.js",
        isEnabled: () => false,
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
        new URL("http://localhost/api/v1/ui/settings-sections"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    const payload = JSON.parse(recorder.body);
    assert.deepEqual(
        payload.data.map((section: { id: string }) => section.id),
        ["enabled-section"],
    );
});

test("GET /api/v1/ui/settings-sections filters sections by access policy", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerSettingsSection({
        id: "user-section",
        label: "User",
        scriptUrl: "/static/gateways/user/prefs.js",
    });
    uiRegistry.registerSettingsSection({
        id: "moderator-section",
        label: "Moderator",
        scriptUrl: "/static/gateways/moderator/prefs.js",
        access: { minRole: "moderator" },
    });
    uiRegistry.registerSettingsSection({
        id: "owner-section",
        label: "Owner",
        scriptUrl: "/static/gateways/owner/prefs.js",
        access: { onlyRole: "owner" },
    });
    const route = createUiRoutes(undefined, uiRegistry);

    const moderatorToken = issueAccessToken("u1", "moderator", 60);
    const moderatorRecorder = createResponseRecorder();
    await route(
        {
            method: "GET",
            headers: {
                cookie: `cognis_access_token=${moderatorToken}`,
                authorization: `Bearer ${moderatorToken}`,
            },
        } as any,
        moderatorRecorder.res as any,
        new URL("http://localhost/api/v1/ui/settings-sections"),
    );
    const moderatorPayload = JSON.parse(moderatorRecorder.body);
    assert.deepEqual(
        moderatorPayload.data.map((section: { id: string }) => section.id),
        ["user-section", "moderator-section"],
    );

    const ownerToken = issueAccessToken("u2", "owner", 60);
    const ownerRecorder = createResponseRecorder();
    await route(
        {
            method: "GET",
            headers: {
                cookie: `cognis_access_token=${ownerToken}`,
                authorization: `Bearer ${ownerToken}`,
            },
        } as any,
        ownerRecorder.res as any,
        new URL("http://localhost/api/v1/ui/settings-sections"),
    );
    const ownerPayload = JSON.parse(ownerRecorder.body);
    assert.deepEqual(
        ownerPayload.data.map((section: { id: string }) => section.id),
        ["user-section", "moderator-section", "owner-section"],
    );
});

test("GET /api/v1/ui/settings-sections returns 401 for unauthenticated request", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerSettingsSection({
        id: "study",
        label: "Study",
        scriptUrl: "/static/gateways/study/study-prefs.js",
    });
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    await route(
        { method: "GET", headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/api/v1/ui/settings-sections"),
    );

    assert.equal(recorder.status, 401);
});

test("manifest.webmanifest is served unauthenticated with PWA mime type", async () => {
    const route = createUiRoutes();
    const recorder = createResponseRecorder();

    const handled = await route(
        { method: "GET", headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/manifest.webmanifest"),
    );

    assert.equal(handled, true);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "application/manifest+json; charset=utf-8",
    );
    const parsed = JSON.parse(recorder.body);
    assert.equal(parsed.name, "Cognis");
    assert.equal(parsed.start_url, "/dashboard");
    assert.equal(parsed.scope, "/");
    assert.equal(parsed.display, "standalone");
    const sizes = parsed.icons.map((icon: any) => icon.sizes);
    assert.ok(sizes.includes("192x192"));
    assert.ok(sizes.includes("512x512"));
    const purposes = parsed.icons.map((icon: any) => icon.purpose);
    assert.ok(purposes.includes("maskable"));
});

test("/sw.js is served unauthenticated with root scope header", async () => {
    const route = createUiRoutes();
    const recorder = createResponseRecorder();

    const handled = await route(
        { method: "GET", headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/sw.js"),
    );

    assert.equal(handled, true);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
    assert.equal(recorder.headers["service-worker-allowed"], "/");
    assert.match(recorder.body, /addEventListener\(['"]install['"]/);
    assert.match(recorder.body, /addEventListener\(['"]fetch['"]/);
});
