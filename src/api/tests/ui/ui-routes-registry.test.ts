import test from "node:test";
import assert from "node:assert/strict";
import { createUiRoutes } from "../../routes/ui/index.js";
import path from "node:path";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";
import { UIRegistry as StaticUIRegistry } from "../../ui-registry.js";

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
        new URL("http://localhost/static/gateways/auth/security-prefs.js"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    assert.equal(
        recorder.headers["content-type"],
        "text/javascript; charset=utf-8",
    );
    assert.match(recorder.body, /createSettingsSection/);
});

test("GET /static/gateways/:id/:file returns 404 when static dir not registered", async () => {
    const uiRegistry = new StaticUIRegistry();
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL("http://localhost/static/gateways/auth/security-prefs.js"),
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

test("GET /static/modules/study/languages/reuse/study-sub-navigation.js serves shared Study language assets", async () => {
    const uiRegistry = new StaticUIRegistry();
    const studyLanguageReuseDir = path.resolve(
        process.cwd(),
        "src",
        "modules",
        "study",
        "languages",
        "reuse",
    );
    uiRegistry.registerModuleStaticDir(
        "study/languages/reuse",
        studyLanguageReuseDir,
    );
    const route = createUiRoutes(undefined, uiRegistry);

    const recorder = createResponseRecorder();
    const handled = await route(
        { headers: {} } as any,
        recorder.res as any,
        new URL(
            "http://localhost/static/modules/study/languages/reuse/study-sub-navigation.js",
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

test("GET /api/v1/ui/app-routes returns registered routes for authenticated user", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerSpaRoute({
        id: "messages-page",
        pattern: "^/messages(?:/[^/]+)?$",
        base: "/messages",
        scriptUrl: "/static/adapters/social/messages/app.js",
        stylesheets: ["/static/adapters/social/messages/messages.css"],
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
        new URL("http://localhost/api/v1/ui/app-routes"),
    );

    assert.ok(handled);
    assert.equal(recorder.status, 200);
    const payload = JSON.parse(recorder.body);
    assert.equal(payload.data.length, 1);
    assert.equal(payload.data[0].id, "messages-page");
});

test("GET /api/v1/ui/app-routes filters disabled and protected routes", async () => {
    const uiRegistry = new StaticUIRegistry();
    uiRegistry.registerSpaRoute({
        id: "enabled-public",
        pattern: "^/messages(?:/[^/]+)?$",
        base: "/messages",
        scriptUrl: "/static/adapters/social/messages/app.js",
        isEnabled: () => true,
    });
    uiRegistry.registerSpaRoute({
        id: "disabled-route",
        pattern: "^/disabled$",
        base: "/disabled",
        scriptUrl: "/static/adapters/disabled/app.js",
        isEnabled: () => false,
    });
    uiRegistry.registerSpaRoute({
        id: "admin-only",
        pattern: "^/admin-only$",
        base: "/admin-only",
        scriptUrl: "/static/adapters/admin/app.js",
        access: { minRole: "admin" },
    });
    const route = createUiRoutes(undefined, uiRegistry);

    const userToken = issueAccessToken("u1", "user", 60);
    const userRecorder = createResponseRecorder();
    await route(
        {
            method: "GET",
            headers: {
                cookie: `cognis_access_token=${userToken}`,
                authorization: `Bearer ${userToken}`,
            },
        } as any,
        userRecorder.res as any,
        new URL("http://localhost/api/v1/ui/app-routes"),
    );
    const userPayload = JSON.parse(userRecorder.body);
    assert.deepEqual(
        userPayload.data.map((entry: { id: string }) => entry.id),
        ["enabled-public"],
    );

    const adminToken = issueAccessToken("u2", "admin", 60);
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
        new URL("http://localhost/api/v1/ui/app-routes"),
    );
    const adminPayload = JSON.parse(adminRecorder.body);
    assert.deepEqual(
        adminPayload.data.map((entry: { id: string }) => entry.id),
        ["enabled-public", "admin-only"],
    );
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
