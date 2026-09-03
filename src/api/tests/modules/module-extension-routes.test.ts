import test from "node:test";
import assert from "node:assert/strict";
import { createModuleExtensionRoutes } from "../../reuse/module-extension-routes.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { createCtx } from "@cognis/core";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("core manifests are not loaded from the external module directory", async () => {
    const errors: string[] = [];
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "cognis-core",
                    uuid: "b4d49c4a-61d0-5db2-84fd-f89b80fd6398",
                    class: "core",
                    entrypoints: {},
                },
            ],
        } as any,
        () => true,
        (level, message) => {
            if (level === "error") errors.push(message);
        },
        { routeContext: createDefaultRouteContext() },
    );

    await extensions.refresh();

    assert.deepEqual(errors, []);
});

test("a timed-out module bootstrap is disabled without blocking refresh", async () => {
    const modulesRoot = await mkdtemp(path.join(tmpdir(), "cognis-modules-"));
    const moduleUuid = "41ad9d2b-463e-4f50-8a62-f02d02d5e303";
    const moduleRoot = path.join(modulesRoot, moduleUuid);
    await mkdir(moduleRoot);
    await writeFile(
        path.join(moduleRoot, "bootstrap.js"),
        `export async function bootstrapModule(ctx) {
            await new Promise((resolve) => setTimeout(resolve, 30));
            ctx.contributePublicCapability("stalled-module:late", true);
            ctx.registerApiGet("/api/v1/modules/stalled/late", () => {});
        }`,
    );
    const previousModulesRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = modulesRoot;
    const failed: string[] = [];
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "stalled-module",
                    uuid: moduleUuid,
                    entrypoints: { bootstrap: "./bootstrap.js" },
                },
            ],
        } as any,
        () => true,
        undefined,
        {
            routeContext: createDefaultRouteContext(),
            bootstrapTimeoutMs: 10,
            onBootstrapFailed: (moduleId) => {
                failed.push(moduleId);
            },
        },
    );

    try {
        await extensions.refresh();
        assert.deepEqual(failed, ["stalled-module"]);
        await new Promise((resolve) => setTimeout(resolve, 40));
        assert.equal(
            await extensions.handle(
                { method: "GET" } as any,
                {} as any,
                new URL("http://localhost/api/v1/modules/stalled/late"),
            ),
            false,
        );
    } finally {
        if (previousModulesRoot === undefined)
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        else process.env.COGNIS_EXTERNAL_MODULES_ROOT = previousModulesRoot;
        await rm(modulesRoot, { recursive: true, force: true });
    }
});

test("disabling a module removes its routes, UI, capabilities, and flow hooks", async () => {
    const modulesRoot = await mkdtemp(path.join(tmpdir(), "cognis-modules-"));
    const moduleUuid = "b76c6666-b6a7-4c7f-95ac-313fd8f33eb0";
    const moduleRoot = path.join(modulesRoot, moduleUuid);
    await mkdir(moduleRoot);
    await writeFile(
        path.join(moduleRoot, "bootstrap.js"),
        `globalThis.__cognisOwnedModuleImports = (globalThis.__cognisOwnedModuleImports ?? 0) + 1;
        export async function bootstrapModule(ctx) {
            ctx.contributePublicCapability("owned-module:feature", true);
            ctx.flow.extend("host-flow", "extensions", { id: "owned-module:hook" }, () => "active");
            ctx.registerAdminSection({ id: "owned-module", label: "Owned", scriptUrl: "/static/modules/owned-module/admin.js" });
            ctx.registerNavbarPlugin({ scriptUrl: "/static/modules/owned-module/navbar.js" });
            ctx.registerSpaRoute({ id: "owned-module-page", pattern: "^/owned$", base: "/owned", scriptUrl: "/static/modules/owned-module/app.js", componentPage: { labelKey: "module.owned.page", descriptionKey: "module.owned.description", modes: ["fullscreen"] } });
            ctx.registerApiGet("/api/v1/modules/owned", (_req, res) => { res.writeHead(200); res.end("ok"); });
            ctx.registerApiGet("/api/v1/modules/owned/config", (_req, res) => { res.writeHead(ctx.getCapability("system:ctx") ? 500 : 200); res.end("config"); }, { allowWhenDisabled: true });
            return () => { throw new Error("expected teardown failure"); };
        }`,
    );
    const previousModulesRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = modulesRoot;
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
                    uuid: moduleUuid,
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
        assert.equal(
            (
                globalThis as typeof globalThis & {
                    __cognisOwnedModuleImports?: number;
                }
            ).__cognisOwnedModuleImports,
            1,
        );
        assert.equal(systemCtx.hasCapability("owned-module:feature"), true);
        assert.equal(uiRegistry.listAdminSections().length, 1);
        assert.equal(uiRegistry.listNavbarPlugins().length, 1);
        assert.equal(uiRegistry.listSpaRoutes().length, 1);
        assert.equal(uiRegistry.listSpaRoutes()[0].ownerUuid, moduleUuid);
        assert.deepEqual(
            (await systemCtx.runFlow("host-flow")).stageResults.extensions,
            ["active"],
        );

        enabled = false;
        await extensions.refresh();
        assert.equal(
            (
                globalThis as typeof globalThis & {
                    __cognisOwnedModuleImports?: number;
                }
            ).__cognisOwnedModuleImports,
            1,
        );
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
        assert.equal(
            await extensions.handle(
                { method: "GET" } as any,
                {
                    writeHead() {},
                    end() {},
                } as any,
                new URL("http://localhost/api/v1/modules/owned/config"),
            ),
            false,
        );
    } finally {
        delete (
            globalThis as typeof globalThis & {
                __cognisOwnedModuleImports?: number;
            }
        ).__cognisOwnedModuleImports;
        if (previousModulesRoot === undefined) {
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        } else {
            process.env.COGNIS_EXTERNAL_MODULES_ROOT = previousModulesRoot;
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
        `export async function bootstrapModule(ctx) {
            if (typeof ctx.getCapability("auth:requireAuth") !== "function") {
                throw new Error("auth capability unavailable");
            }
            ctx.registerStaticDir("", ctx.moduleRoot + "/ui");
            ctx.registerNavbarPlugin({ scriptUrl: "/static/modules/meetings/navbar.js", providesCapabilities: ["voip:startCall"] });
            ctx.registerSpaRoute({ id: "meetings", pattern: "^/meetings$", base: "/meetings", scriptUrl: "/static/modules/meetings/app.js" });
            ctx.registerAuthTypingMessage({ id: "meetings-ready", textKey: "module.meetings.ready" });
            ctx.log("info", "Meetings module started.", { operation: "bootstrap" });
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
    uiRegistry.registerCapabilityProvider({
        scriptUrl: "/static/share-popup.js",
        providesCapabilities: ["share:openPopup"],
    });
    const logEntries: Array<{
        level: string;
        message: string;
        meta?: Record<string, unknown>;
    }> = [];
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "meetings",
                    uuid: moduleUuid,
                    requiresCapabilities: [
                        "ui:profileAvatarRenderer",
                        "share:openPopup",
                    ],
                    entrypoints: { bootstrap: "./bootstrap.js" },
                },
            ],
        } as any,
        () => true,
        (level, message, meta) => logEntries.push({ level, message, meta }),
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
        assert.deepEqual(
            uiRegistry.listCapabilityProviders().map((provider) => ({
                scriptUrl: provider.scriptUrl,
                providesCapabilities: provider.providesCapabilities,
            })),
            [
                {
                    scriptUrl: "/static/profile-avatar.js",
                    providesCapabilities: ["ui:profileAvatarRenderer"],
                },
                {
                    scriptUrl: "/static/modules/meetings/navbar.js",
                    providesCapabilities: ["voip:startCall"],
                },
                {
                    scriptUrl: "/static/share-popup.js",
                    providesCapabilities: ["share:openPopup"],
                },
            ],
        );
        assert.equal(uiRegistry.listSpaRoutes()[0].base, "/meetings");
        assert.deepEqual(uiRegistry.listSpaRoutes()[0].capabilityScripts, [
            "/static/profile-avatar.js",
            "/static/share-popup.js",
        ]);
        assert.equal(uiRegistry.listAuthTypingMessages().length, 1);
        assert.equal(systemCtx.getCapability("meetings:provider"), "external");
        assert.deepEqual(
            logEntries.find(
                ({ message }) => message === "Meetings module started.",
            ),
            {
                level: "info",
                message: "Meetings module started.",
                meta: {
                    operation: "bootstrap",
                    component: "module:meetings",
                    moduleId: "meetings",
                },
            },
        );

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
