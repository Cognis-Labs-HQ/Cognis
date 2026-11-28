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
        end(responseBody: string) {
            payload = responseBody;
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
    const uiRegistry = new UIRegistry();
    uiRegistry.registerAdminSection({
        id: "s1",
        label: "Section One",
        scriptUrl: "/static/gateways/gw/s1.js",
    });
    uiRegistry.registerAdminSection({
        id: "s2",
        label: "Section Two",
        scriptUrl: "/static/gateways/gw/s2.js",
    });

    const sections = uiRegistry.listAdminSections();
    assert.equal(sections.length, 2);
    assert.equal(sections[0].id, "s1");
    assert.equal(sections[1].id, "s2");
});

test("UIRegistry prevents modules from replacing another owner's UI", () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerAdminSection({
        id: "shared-admin",
        label: "Owner One",
        scriptUrl: "/static/modules/one/admin.js",
        ownerId: "one",
    });
    assert.throws(
        () =>
            uiRegistry.registerAdminSection({
                id: "shared-admin",
                label: "Owner Two",
                scriptUrl: "/static/modules/two/admin.js",
                ownerId: "two",
            }),
        /ui_registration_conflict/,
    );
    uiRegistry.registerSpaRoute({
        id: "owner-one-page",
        pattern: "^/shared$",
        base: "/shared",
        scriptUrl: "/static/modules/one/page.js",
        ownerId: "one",
    });
    assert.throws(
        () =>
            uiRegistry.registerSpaRoute({
                id: "owner-two-page",
                pattern: "^/shared$",
                base: "/shared",
                scriptUrl: "/static/modules/two/page.js",
                ownerId: "two",
            }),
        /ui_registration_conflict/,
    );
});

test("UIRegistry removes every contribution owned by a module", () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerAdminSection({
        id: "example-admin",
        label: "Example",
        scriptUrl: "/static/modules/example/admin.js",
        ownerId: "example",
    });
    uiRegistry.registerPageExtension("dashboard", {
        id: "example-widget",
        label: "Example",
        scriptUrl: "/static/modules/example/widget.js",
        ownerId: "example",
    });
    uiRegistry.registerSpaRoute({
        id: "example-page",
        pattern: "^/example$",
        base: "/example",
        scriptUrl: "/static/modules/example/page.js",
        ownerId: "example",
    });
    uiRegistry.registerAuthTypingMessage({
        id: "example-ready",
        textKey: "module.example.ready",
        ownerType: "module",
        ownerId: "example",
    });
    uiRegistry.registerModuleStaticDirectory("example", "/srv/example/ui");

    uiRegistry.unregisterModuleContributions("example");

    assert.deepEqual(uiRegistry.listAdminSections(), []);
    assert.deepEqual(uiRegistry.listPageExtensions("dashboard"), []);
    assert.deepEqual(uiRegistry.listSpaRoutes(), []);
    assert.deepEqual(uiRegistry.listAuthTypingMessages(), []);
    assert.equal(uiRegistry.resolveModulePath("example/page.js"), undefined);
});

test("UIRegistry registers and looks up static dirs", () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerStaticDirectory("notify", "/srv/notify/ui");

    assert.equal(uiRegistry.getStaticDirectory("notify"), "/srv/notify/ui");
    assert.equal(uiRegistry.getStaticDirectory("missing"), undefined);
});

test("UIRegistry overwrites section when registered twice with same id", () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerAdminSection({
        id: "x",
        label: "Old",
        scriptUrl: "/old.js",
    });
    uiRegistry.registerAdminSection({
        id: "x",
        label: "New",
        scriptUrl: "/new.js",
    });

    const sections = uiRegistry.listAdminSections();
    assert.equal(sections.length, 1);
    assert.equal(sections[0].label, "New");
});

test("UIRegistry registers and lists page extensions", () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerPageExtension("dashboard", {
        id: "profile-widget",
        label: "Profile",
        scriptUrl: "/static/gateways/profile/dashboard-widget.js",
    });
    uiRegistry.registerPageExtension("dashboard", {
        id: "notif-widget",
        label: "Notifications",
        scriptUrl: "/static/gateways/notify/dashboard-widget.js",
    });
    uiRegistry.registerPageExtension("settings", {
        id: "profile-settings",
        label: "Profile Settings",
        scriptUrl: "/static/gateways/profile/settings-section.js",
    });

    const dashExtensions = uiRegistry.listPageExtensions("dashboard");
    assert.equal(dashExtensions.length, 2);
    assert.equal(dashExtensions[0].id, "profile-widget");
    assert.equal(dashExtensions[1].id, "notif-widget");

    const settingsExtensions = uiRegistry.listPageExtensions("settings");
    assert.equal(settingsExtensions.length, 1);
    assert.equal(settingsExtensions[0].id, "profile-settings");

    assert.deepEqual(uiRegistry.listPageExtensions("unknown"), []);
});

test("UIRegistry registers and lists SPA routes", () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerSpaRoute({
        id: "messages-page",
        pattern: "^/messages(?:/[^/]+)?$",
        base: "/messages",
        scriptUrl: "/static/adapters/social/messages/app.js",
        stylesheets: ["/static/adapters/social/messages/messages.css"],
    });

    const routes = uiRegistry.listSpaRoutes();
    assert.equal(routes.length, 1);
    assert.equal(routes[0].id, "messages-page");
    assert.equal(routes[0].base, "/messages");
    assert.equal(
        routes[0].scriptUrl,
        "/static/adapters/social/messages/app.js",
    );
    assert.equal(
        uiRegistry.resolveSpaRoute("/messages/thread-1")?.id,
        "messages-page",
    );
    assert.equal(uiRegistry.resolveSpaRoute("/settings"), undefined);
});

test("UIRegistry registers enabled authentication footer plugins", () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerAuthFooterPlugin({ scriptUrl: "/legal-footer.js" });
    uiRegistry.registerAuthFooterPlugin({
        scriptUrl: "/disabled-footer.js",
        isEnabled: () => false,
    });
    assert.deepEqual(uiRegistry.listAuthFooterPlugins(), [
        { scriptUrl: "/legal-footer.js" },
    ]);
});

test("UIRegistry rejects role restrictions on public SPA routes", () => {
    const uiRegistry = new UIRegistry();
    assert.throws(
        () =>
            uiRegistry.registerSpaRoute({
                id: "invalid-public-page",
                pattern: "^/public$",
                base: "/public",
                scriptUrl: "/public.js",
                public: true,
                access: { minRole: "user" },
            }),
        /public_spa_route_cannot_require_role/,
    );
});

test("UIRegistry selects only declared UI capability provider scripts", () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/profile.js",
        providesCapabilities: ["ui:profileAvatarRenderer"],
    });
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/unrelated.js",
        providesCapabilities: ["ui:unrelated"],
    });
    uiRegistry.registerSpaRoute({
        id: "meetings",
        pattern: "^/meetings$",
        base: "/meetings",
        scriptUrl: "/meetings.js",
        requiredCapabilities: ["ui:profileAvatarRenderer"],
    });

    assert.deepEqual(uiRegistry.listSpaRoutes()[0].capabilityScripts, [
        "/profile.js",
    ]);
    assert.equal(
        uiRegistry.hasActiveCapabilityProvider("ui:profileAvatarRenderer"),
        true,
    );
    assert.equal(uiRegistry.hasActiveCapabilityProvider("ui:missing"), false);
});

test("UIRegistry omits routes whose UI capability provider is inactive", () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/profile.js",
        providesCapabilities: ["ui:profileAvatarRenderer"],
        isEnabled: () => false,
    });
    uiRegistry.registerSpaRoute({
        id: "meetings",
        pattern: "^/meetings$",
        base: "/meetings",
        scriptUrl: "/meetings.js",
        requiredCapabilities: ["ui:profileAvatarRenderer"],
    });

    assert.deepEqual(uiRegistry.listSpaRoutes(), []);
    assert.equal(
        uiRegistry.hasActiveCapabilityProvider("ui:profileAvatarRenderer"),
        false,
    );
    assert.equal(uiRegistry.resolveSpaRoute("/meetings"), undefined);
});

test("UIRegistry registers and lists auth typing messages", () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerAuthTypingMessage({
        id: "profile-social-space",
        textKey: "ui.app.login.typing.sample.5",
        ownerType: "gateway",
        ownerId: "profile",
    });

    assert.deepEqual(uiRegistry.listAuthTypingMessages(), [
        {
            id: "profile-social-space",
            textKey: "ui.app.login.typing.sample.5",
            ownerType: "gateway",
            ownerId: "profile",
        },
    ]);
});

test("GET /api/v1/ui/page-extensions/:pageId returns extensions for authenticated user", async () => {
    const uiRegistry = new UIRegistry();
    uiRegistry.registerPageExtension("dashboard", {
        id: "profile-widget",
        label: "Profile",
        scriptUrl: "/static/gateways/profile/dashboard-widget.js",
    });
    const handler = createUiRoutes(undefined, uiRegistry);

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
    const uiRegistry = new UIRegistry();
    const handler = createUiRoutes(undefined, uiRegistry);

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
    const uiRegistry = new UIRegistry();
    const handler = createUiRoutes(undefined, uiRegistry);

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
    const uiRegistry = new UIRegistry();
    uiRegistry.registerAuthTypingMessage({
        id: "profile-social-space",
        textKey: "ui.app.login.typing.sample.5",
        ownerType: "gateway",
        ownerId: "profile",
    });
    uiRegistry.registerAuthTypingMessage({
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
    await gatewayRegistry.disable("registration");
    const handler = createUiRoutes(
        undefined,
        uiRegistry,
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

test("host UI capability providers satisfy module routes and supply their script", () => {
    const registry = new UIRegistry();
    registry.registerCapabilityProvider({
        scriptUrl: "/static/reuse/feedback-capabilities.js",
        providesCapabilities: ["ui:showToast"],
    });
    registry.registerSpaRoute({
        id: "external-module",
        pattern: "^/external$",
        base: "/external",
        scriptUrl: "/static/modules/external/index.js",
        requiredCapabilities: ["ui:showToast"],
    });

    assert.equal(registry.hasActiveCapabilityProvider("ui:showToast"), true);
    assert.deepEqual(registry.listSpaRoutes()[0].capabilityScripts, [
        "/static/reuse/feedback-capabilities.js",
    ]);
    assert.deepEqual(
        registry
            .listCapabilityProviders()
            .map((provider) => provider.scriptUrl),
        ["/static/reuse/feedback-capabilities.js"],
    );
});

test("production route descriptors resolve script and stylesheet URLs inside arrays", () => {
    const registry = new UIRegistry(
        new URL("./fixtures/asset-manifest.json", import.meta.url).pathname,
    );
    const descriptor = registry.resolveDescriptor({
        capabilityScripts: ["/static/adapters/example/sample/ui/provider.js"],
        stylesheets: ["/static/adapters/example/sample/ui/styles.css"],
    });
    assert.deepEqual(descriptor.capabilityScripts, [
        "/assets/provider-ABC123.js",
    ]);
    assert.deepEqual(descriptor.stylesheets, ["/assets/styles-ABC123.css"]);
});
