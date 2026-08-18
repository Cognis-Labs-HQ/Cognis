import test from "node:test";
import assert from "node:assert/strict";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { createGatewayRoutes } from "../../routes/gateways/index.js";
import { createUiRoutes } from "../../routes/ui/index.js";
import { GatewayRegistry } from "@cognis/core";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";

function makeRequest(method: string, token?: string) {
    return {
        method,
        headers: token
            ? {
                  cookie: `cognis_access_token=${token}`,
                  authorization: `Bearer ${token}`,
              }
            : {},
    } as any;
}

function makeResponse() {
    let status = 0;
    let payload = "";
    return {
        writeHead(code: number) {
            status = code;
        },
        end(p: string) {
            payload = p;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    } as any;
}

const adminToken = issueAccessToken("test-session", "admin", 60);
const userToken = issueAccessToken("test-session", "user", 60);

test("UIRegistry registers and lists admin sections", () => {
    const reg = new UIRegistry();
    reg.registerAdminSection({
        id: "s1",
        label: "Section One",
        scriptUrl: "/static/gateways/gw/s1.js",
    });
    reg.registerAdminSection({
        id: "s2",
        label: "Section Two",
        scriptUrl: "/static/gateways/gw/s2.js",
    });

    const sections = reg.listAdminSections();
    assert.equal(sections.length, 2);
    assert.equal(sections[0].id, "s1");
    assert.equal(sections[1].id, "s2");
});

test("UIRegistry removes every contribution owned by a module", () => {
    const reg = new UIRegistry();
    reg.registerAdminSection({
        id: "example-admin",
        label: "Example",
        scriptUrl: "/static/modules/example/admin.js",
        ownerId: "example",
    });
    reg.registerPageExtension("dashboard", {
        id: "example-widget",
        label: "Example",
        scriptUrl: "/static/modules/example/widget.js",
        ownerId: "example",
    });
    reg.registerSpaRoute({
        id: "example-page",
        pattern: "^/example$",
        base: "/example",
        scriptUrl: "/static/modules/example/page.js",
        ownerId: "example",
    });
    reg.registerAuthTypingMessage({
        id: "example-ready",
        textKey: "module.example.ready",
        ownerType: "module",
        ownerId: "example",
    });
    reg.registerModuleStaticDir("example", "/srv/example/ui");

    reg.unregisterModuleContributions("example");

    assert.deepEqual(reg.listAdminSections(), []);
    assert.deepEqual(reg.listPageExtensions("dashboard"), []);
    assert.deepEqual(reg.listSpaRoutes(), []);
    assert.deepEqual(reg.listAuthTypingMessages(), []);
    assert.equal(reg.resolveModulePath("example/page.js"), undefined);
});

test("UIRegistry registers and looks up static dirs", () => {
    const reg = new UIRegistry();
    reg.registerStaticDir("notify", "/srv/notify/ui");

    assert.equal(reg.getStaticDir("notify"), "/srv/notify/ui");
    assert.equal(reg.getStaticDir("missing"), undefined);
});

test("UIRegistry overwrites section when registered twice with same id", () => {
    const reg = new UIRegistry();
    reg.registerAdminSection({ id: "x", label: "Old", scriptUrl: "/old.js" });
    reg.registerAdminSection({ id: "x", label: "New", scriptUrl: "/new.js" });

    const sections = reg.listAdminSections();
    assert.equal(sections.length, 1);
    assert.equal(sections[0].label, "New");
});

test("UIRegistry registers and lists page extensions", () => {
    const reg = new UIRegistry();
    reg.registerPageExtension("dashboard", {
        id: "profile-widget",
        label: "Profile",
        scriptUrl: "/static/gateways/profile/dashboard-widget.js",
    });
    reg.registerPageExtension("dashboard", {
        id: "notif-widget",
        label: "Notifications",
        scriptUrl: "/static/gateways/notify/dashboard-widget.js",
    });
    reg.registerPageExtension("settings", {
        id: "profile-settings",
        label: "Profile Settings",
        scriptUrl: "/static/gateways/profile/settings-section.js",
    });

    const dashExts = reg.listPageExtensions("dashboard");
    assert.equal(dashExts.length, 2);
    assert.equal(dashExts[0].id, "profile-widget");
    assert.equal(dashExts[1].id, "notif-widget");

    const settingsExts = reg.listPageExtensions("settings");
    assert.equal(settingsExts.length, 1);
    assert.equal(settingsExts[0].id, "profile-settings");

    assert.deepEqual(reg.listPageExtensions("unknown"), []);
});

test("UIRegistry registers and lists SPA routes", () => {
    const reg = new UIRegistry();
    reg.registerSpaRoute({
        id: "messages-page",
        pattern: "^/messages(?:/[^/]+)?$",
        base: "/messages",
        scriptUrl: "/static/adapters/social/messages/app.js",
        stylesheets: ["/static/adapters/social/messages/messages.css"],
    });

    const routes = reg.listSpaRoutes();
    assert.equal(routes.length, 1);
    assert.equal(routes[0].id, "messages-page");
    assert.equal(routes[0].base, "/messages");
    assert.equal(
        routes[0].scriptUrl,
        "/static/adapters/social/messages/app.js",
    );
    assert.equal(
        reg.resolveSpaRoute("/messages/thread-1")?.id,
        "messages-page",
    );
    assert.equal(reg.resolveSpaRoute("/settings"), undefined);
});

test("UIRegistry selects only declared UI capability provider scripts", () => {
    const reg = new UIRegistry();
    reg.registerNavbarPlugin({
        scriptUrl: "/profile.js",
        providesCapabilities: ["ui:profileAvatarRenderer"],
    });
    reg.registerNavbarPlugin({
        scriptUrl: "/unrelated.js",
        providesCapabilities: ["ui:unrelated"],
    });
    reg.registerSpaRoute({
        id: "meetings",
        pattern: "^/meetings$",
        base: "/meetings",
        scriptUrl: "/meetings.js",
        requiredCapabilities: ["ui:profileAvatarRenderer"],
    });

    assert.deepEqual(reg.listSpaRoutes()[0].capabilityScripts, ["/profile.js"]);
});

test("UIRegistry registers and lists auth typing messages", () => {
    const reg = new UIRegistry();
    reg.registerAuthTypingMessage({
        id: "profile-social-space",
        textKey: "ui.app.login.typing.sample.5",
        ownerType: "gateway",
        ownerId: "profile",
    });

    assert.deepEqual(reg.listAuthTypingMessages(), [
        {
            id: "profile-social-space",
            textKey: "ui.app.login.typing.sample.5",
            ownerType: "gateway",
            ownerId: "profile",
        },
    ]);
});

test("GET /api/v1/ui/page-extensions/:pageId returns extensions for authenticated user", async () => {
    const uiReg = new UIRegistry();
    uiReg.registerPageExtension("dashboard", {
        id: "profile-widget",
        label: "Profile",
        scriptUrl: "/static/gateways/profile/dashboard-widget.js",
    });
    const handler = createUiRoutes(undefined, uiReg);

    const req = makeRequest("GET", userToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("http://localhost/api/v1/ui/page-extensions/dashboard"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, "profile-widget");
});

test("GET /api/v1/ui/page-extensions/:pageId returns 401 for unauthenticated request", async () => {
    const uiReg = new UIRegistry();
    const handler = createUiRoutes(undefined, uiReg);

    const req = makeRequest("GET");
    const res = makeResponse();
    await handler(
        req,
        res,
        new URL("http://localhost/api/v1/ui/page-extensions/dashboard"),
    );

    assert.equal(res.status, 401);
});

test("GET /api/v1/ui/page-extensions/:pageId returns empty array when no extensions registered", async () => {
    const uiReg = new UIRegistry();
    const handler = createUiRoutes(undefined, uiReg);

    const req = makeRequest("GET", userToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("http://localhost/api/v1/ui/page-extensions/dashboard"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.payload).data, []);
});

test("GET /api/v1/ui/page-extensions/:pageId returns empty array without uiRegistry", async () => {
    const handler = createUiRoutes();

    const req = makeRequest("GET", userToken);
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("http://localhost/api/v1/ui/page-extensions/dashboard"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.payload).data, []);
});

test("GET /api/v1/ui/auth-typing-messages returns public messages and filters disabled gateways", async () => {
    const uiReg = new UIRegistry();
    uiReg.registerAuthTypingMessage({
        id: "profile-social-space",
        textKey: "ui.app.login.typing.sample.5",
        ownerType: "gateway",
        ownerId: "profile",
    });
    uiReg.registerAuthTypingMessage({
        id: "registration-register-today",
        textKey: "ui.app.login.typing.sample.7",
        ownerType: "gateway",
        ownerId: "registration",
    });
    const gatewayRegistry = new GatewayRegistry();
    gatewayRegistry.register({
        id: "profile",
        name: "Profile Gateway",
        version: "1.0.0",
    });
    gatewayRegistry.register({
        id: "registration",
        name: "Registration Gateway",
        version: "1.0.0",
    });
    gatewayRegistry.disable("registration");
    const handler = createUiRoutes(
        undefined,
        uiReg,
        undefined,
        gatewayRegistry,
    );

    const req = makeRequest("GET");
    const res = makeResponse();
    const handled = await handler(
        req,
        res,
        new URL("http://localhost/api/v1/ui/auth-typing-messages"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.payload).data, [
        {
            id: "profile-social-space",
            textKey: "ui.app.login.typing.sample.5",
            ownerType: "gateway",
            ownerId: "profile",
        },
    ]);
});

test("GET /api/v1/ui/auth-typing-messages includes enabled module manifest messages", async () => {
    const route = createUiRoutes(
        {
            listManifests: async () => [
                {
                    id: "calendar",
                    name: "Calendar",
                    version: "1.0.0",
                    class: "extension",
                    coreApiVersion: "1.0.0",
                    capabilities: [],
                    entrypoints: {},
                    ui: {
                        authTypingMessages: [
                            "module.calendar.auth_typing.welcome",
                        ],
                    },
                },
            ],
        } as any,
        new UIRegistry(),
        undefined,
        undefined,
        (moduleId) => moduleId === "calendar",
    );

    const req = makeRequest("GET");
    const res = makeResponse();
    const handled = await route(
        req,
        res,
        new URL("http://localhost/api/v1/ui/auth-typing-messages"),
    );

    assert.ok(handled);
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.payload).data, [
        {
            id: "calendar:0",
            textKey: "module.calendar.auth_typing.welcome",
            ownerType: "module",
            ownerId: "calendar",
        },
    ]);
});
