import test from "node:test";
import assert from "node:assert/strict";
import { createModuleExtensionRoutes } from "../module-extensions.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";
import { createDefaultRouteContext } from "../../../api/reuse/route-context.js";
import { UIRegistry } from "../../../api/reuse/ui-registry.js";
import { createCtx } from "@cognis/core";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("module extension routes expose module API endpoints", async () => {
    const mockDb = {
        async ensureTable() {},
        async executeCommand(_command: any) {
            return { rows: [] };
        },
        async transaction(callback: (executor: any) => Promise<any>) {
            return callback(this);
        },
    };
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "analytics",
                    entrypoints: { api: "./api/index.js" },
                },
            ],
        } as any,
        () => true,
        undefined,
        {
            routeContext: createDefaultRouteContext({
                getCapability: (id: string) =>
                    id === "db:executor" ? mockDb : undefined,
            }),
        },
    );
    await extensions.refresh();

    let status = 0;
    let body = "";

    const adminToken = issueAccessToken("owner", "owner", 60);
    const handled = await extensions.handle(
        {
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/analytics/metrics"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /totalUsers/);
});

test("module extension routes enforce declared minimum role policies", async () => {
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "analytics",
                    entrypoints: { api: "./api/index.js" },
                },
            ],
        } as any,
        () => true,
        undefined,
        { routeContext: createDefaultRouteContext() },
    );
    await extensions.refresh();

    let status = 0;
    let body = "";

    const userToken = issueAccessToken("learner", "user", 60);
    const handled = await extensions.handle(
        {
            method: "GET",
            headers: { authorization: `Bearer ${userToken}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/analytics/metrics"),
    );

    assert.equal(handled, true);
    assert.equal(status, 403);
    assert.match(body, /Requires admin scope/);
});

test("module extension routes fail closed on invalid role access policies", async () => {
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "analytics",
                    entrypoints: { api: "./api/invalid-access.js" },
                },
            ],
        } as any,
        () => true,
        undefined,
        { routeContext: createDefaultRouteContext() },
    );
    await extensions.refresh();

    let status = 0;
    let body = "";

    const ownerToken = issueAccessToken("owner", "owner", 60);
    const handled = await extensions.handle(
        {
            method: "GET",
            headers: { authorization: `Bearer ${ownerToken}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/analytics-invalid/metrics"),
    );

    assert.equal(handled, true);
    assert.equal(status, 403);
    assert.match(body, /invalid access policy/i);
});

test("module extension routes register module admin sections with enable hooks", async () => {
    let enabled = false;
    const adminSections: Array<{
        id: string;
        label: string;
        scriptUrl: string;
        access?: { minRole: string };
        isEnabled?: () => boolean;
    }> = [];
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "analytics",
                    entrypoints: { api: "./api/index.js" },
                },
            ],
        } as any,
        () => enabled,
        undefined,
        {
            routeContext: createDefaultRouteContext(),
            uiRegistry: {
                registerModuleStaticDir() {},
                registerAdminSection(section: any) {
                    adminSections.push(section);
                },
                unregisterModuleContributions() {
                    adminSections.length = 0;
                },
            } as any,
        },
    );
    await extensions.refresh();

    assert.equal(adminSections.length, 0);
    enabled = true;
    await extensions.refresh();
    assert.equal(adminSections.length, 1);
    assert.equal(adminSections[0].id, "analytics");
    assert.equal(
        adminSections[0].scriptUrl,
        "/static/modules/analytics/admin-section.js",
    );
    assert.equal(adminSections[0].isEnabled?.(), true);
    enabled = false;
    await extensions.refresh();
    assert.equal(adminSections.length, 0);
});

test("disabling a module removes its routes, UI, capabilities, and flow hooks", async () => {
    const modulesRoot = await mkdtemp(path.join(tmpdir(), "cognis-modules-"));
    const moduleRoot = path.join(modulesRoot, "owned-module");
    await mkdir(moduleRoot);
    await writeFile(
        path.join(moduleRoot, "bootstrap.js"),
        `export function bootstrapModule(ctx) {
            ctx.contributePublicCapability("owned-module:feature", true);
            ctx.flow.extend("host-flow", "extensions", { id: "owned-module:hook" }, () => "active");
            ctx.registerAdminSection({ id: "owned-module", label: "Owned", scriptUrl: "/static/modules/owned-module/admin.js" });
            ctx.registerNavbarPlugin({ scriptUrl: "/static/modules/owned-module/navbar.js" });
            ctx.registerSpaRoute({ id: "owned-module-page", pattern: "^/owned$", base: "/owned", scriptUrl: "/static/modules/owned-module/app.js" });
            ctx.registerApiGet("/api/v1/modules/owned", (_req, res) => { res.writeHead(200); res.end("ok"); });
            return () => { throw new Error("expected teardown failure"); };
        }`,
    );
    const previousModulesRoot = process.env.COGNIS_MODULES_ROOT;
    process.env.COGNIS_MODULES_ROOT = modulesRoot;
    const systemCtx = createCtx();
    systemCtx.registerFlow({ id: "host-flow", stages: ["extensions"] });
    systemCtx.contributeCapability("system:ctx", systemCtx);
    let enabled = true;
    const uiRegistry = new UIRegistry();
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "owned-module",
                    uuid: "b76c6666-b6a7-4c7f-95ac-313fd8f33eb0",
                    entrypoints: { bootstrap: "./bootstrap.js" },
                },
            ],
        } as any,
        () => enabled,
        undefined,
        {
            routeContext: createDefaultRouteContext({
                getCapability: (id) => systemCtx.getCapability(id),
                flow: systemCtx.flow,
            }),
            uiRegistry,
        },
    );
    try {
        await extensions.refresh();
        assert.equal(systemCtx.hasCapability("owned-module:feature"), true);
        assert.equal(uiRegistry.listAdminSections().length, 1);
        assert.equal(uiRegistry.listNavbarPlugins().length, 1);
        assert.equal(uiRegistry.listSpaRoutes().length, 1);
        assert.deepEqual(
            (await systemCtx.runFlow("host-flow")).stageResults.extensions,
            ["active"],
        );

        enabled = false;
        await extensions.refresh();
        assert.equal(systemCtx.hasCapability("owned-module:feature"), false);
        assert.equal(uiRegistry.listNavbarPlugins().length, 0);
        assert.equal(uiRegistry.listSpaRoutes().length, 0);
        assert.deepEqual(uiRegistry.listAdminSections(), []);
        assert.deepEqual(
            (await systemCtx.runFlow("host-flow")).stageResults.extensions,
            [],
        );
        assert.equal(
            await extensions.handle(
                { method: "GET" } as any,
                {} as any,
                new URL("http://localhost/api/v1/modules/owned"),
            ),
            false,
        );
    } finally {
        if (previousModulesRoot === undefined) {
            delete process.env.COGNIS_MODULES_ROOT;
        } else {
            process.env.COGNIS_MODULES_ROOT = previousModulesRoot;
        }
        await rm(modulesRoot, { recursive: true, force: true });
    }
});

test("external module bootstrap ingests navigation, SPA routes, and ctx capabilities", async () => {
    const externalModulesRoot = await mkdtemp(
        path.join(tmpdir(), "cognis-external-modules-"),
    );
    const moduleUuid = "f055f2e5-227a-5fb4-b934-5397ec32cf2d";
    const moduleRoot = path.join(externalModulesRoot, moduleUuid);
    await mkdir(moduleRoot);
    await writeFile(
        path.join(moduleRoot, "bootstrap.js"),
        `export function bootstrapModule(ctx) {
            if (typeof ctx.getCapability("auth:requireAuth") !== "function") {
                throw new Error("auth capability unavailable");
            }
            ctx.registerStaticDir("", ctx.moduleRoot + "/ui");
            ctx.registerNavbarPlugin({ scriptUrl: "/static/modules/meetings/navbar.js" });
            ctx.registerSpaRoute({ id: "meetings", pattern: "^/meetings$", base: "/meetings", scriptUrl: "/static/modules/meetings/app.js" });
            ctx.registerAuthTypingMessage({ id: "meetings-ready", textKey: "module.meetings.ready" });
            ctx.capabilities.contribute("meetings:provider", "external");
            ctx.router.put("/api/v1/modules/meetings/config", (_req, res) => { res.writeHead(204); res.end(); });
        }`,
    );
    const previousExternalModulesRoot =
        process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = externalModulesRoot;
    const systemCtx = createCtx();
    systemCtx.contributeCapability("system:ctx", systemCtx);
    const requireAuth = () => ({ sub: "module-user", role: "user" });
    const uiRegistry = new UIRegistry();
    uiRegistry.registerNavbarPlugin({
        scriptUrl: "/static/profile-avatar.js",
        providesCapabilities: ["ui:profileAvatarRenderer"],
    });
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "meetings",
                    uuid: moduleUuid,
                    requiresCapabilities: ["ui:profileAvatarRenderer"],
                    entrypoints: { bootstrap: "./bootstrap.js" },
                },
            ],
        } as any,
        () => true,
        undefined,
        {
            routeContext: createDefaultRouteContext({
                getCapability: (id) =>
                    id === "auth:requireAuth"
                        ? (requireAuth as never)
                        : systemCtx.getCapability(id),
                flow: systemCtx.flow,
            }),
            uiRegistry,
        },
    );
    try {
        await extensions.refresh();
        assert.equal(uiRegistry.listNavbarPlugins().length, 2);
        assert.equal(uiRegistry.listSpaRoutes()[0].base, "/meetings");
        assert.deepEqual(uiRegistry.listSpaRoutes()[0].capabilityScripts, [
            "/static/profile-avatar.js",
        ]);
        assert.equal(uiRegistry.listAuthTypingMessages().length, 1);
        assert.equal(systemCtx.getCapability("meetings:provider"), "external");

        let status = 0;
        assert.equal(
            await extensions.handle(
                { method: "PUT" } as any,
                {
                    writeHead(code: number) {
                        status = code;
                    },
                    end() {},
                } as any,
                new URL("http://localhost/api/v1/modules/meetings/config"),
            ),
            true,
        );
        assert.equal(status, 204);
    } finally {
        if (previousExternalModulesRoot === undefined) {
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        } else {
            process.env.COGNIS_EXTERNAL_MODULES_ROOT =
                previousExternalModulesRoot;
        }
        await rm(externalModulesRoot, { recursive: true, force: true });
    }
});
