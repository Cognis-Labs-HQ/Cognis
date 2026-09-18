import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createModuleExtensionRoutes } from "../../reuse/module-extension-routes.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { createCtx } from "@cognis/core";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("uninstall imports the resolved bootstrap entrypoint", async () => {
    const modulesRoot = await mkdtemp(path.join(tmpdir(), "cognis-uninstall-"));
    const moduleUuid = "749a884c-f19e-4586-ae16-518e688e75bb";
    const moduleRoot = path.join(modulesRoot, moduleUuid);
    const markerPath = path.join(modulesRoot, "uninstalled.txt");
    await mkdir(moduleRoot);
    await writeFile(
        path.join(moduleRoot, "bootstrap.js"),
        `import { writeFile } from "node:fs/promises";
         export async function uninstallModule(_ctx, options) {
             await writeFile(${JSON.stringify(markerPath)}, String(options.deleteContent));
         }`,
    );
    const previousModulesRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = modulesRoot;
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "uninstallable-module",
                    uuid: moduleUuid,
                    entrypoints: { bootstrap: "./bootstrap.js" },
                },
            ],
        } as any,
        () => true,
        undefined,
        { routeContext: createDefaultRouteContext() },
    );

    try {
        assert.equal(
            await extensions.uninstall("uninstallable-module", {
                deleteContent: true,
            }),
            true,
        );
        assert.equal(await readFile(markerPath, "utf8"), "true");
    } finally {
        if (previousModulesRoot === undefined) {
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        } else {
            process.env.COGNIS_EXTERNAL_MODULES_ROOT = previousModulesRoot;
        }
        await rm(modulesRoot, { recursive: true, force: true });
    }
});

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
            ctx.registerApiGet("/api/v1/modules/stalled-module/late", () => {});
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
                new URL("http://localhost/api/v1/modules/stalled-module/late"),
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

test("provider routes require an explicit privileged module declaration", async () => {
    const modulesRoot = await mkdtemp(path.join(tmpdir(), "cognis-modules-"));
    const moduleUuid = "806c7ea0-cdc8-4aaa-93f8-ad9d46250367";
    const moduleRoot = path.join(modulesRoot, moduleUuid);
    await mkdir(moduleRoot);
    await writeFile(
        path.join(moduleRoot, "bootstrap.js"),
        `export function bootstrapModule(ctx) {
            ctx.flow.extend("login", "authenticate", { id: "test-sso:authenticate" }, () => undefined);
            const registerProvider = ctx.capabilities.require("auth:registerProvider");
            return registerProvider({
                id: "test-sso",
                name: "Test SSO",
                authenticate: async () => null,
                configure() {},
                getConfigSchema: () => [],
                routeNamespace: "test-sso",
                registerRoutes(router) { router.get("/callback", (_req, res) => res.end("ok")); },
            });
        }`,
    );
    await writeFile(
        path.join(moduleRoot, ".cognis-install.json"),
        JSON.stringify({ cloneUrl: "https://github.com/example/test-sso.git" }),
    );
    const previousModulesRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = modulesRoot;
    const systemCtx = createCtx();
    systemCtx.registerFlow({ id: "login", stages: ["authenticate"] });
    let providerRegistered = false;
    systemCtx.contributeCapability("system:ctx", systemCtx);
    systemCtx.contributeCapability("auth:registerProvider", () => {
        providerRegistered = true;
        return () => {};
    });
    let privileged = false;
    const warnings: string[] = [];
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "test-sso",
                    uuid: moduleUuid,
                    class: "extension",
                    privileged,
                    entrypoints: { bootstrap: "./bootstrap.js" },
                },
            ],
        } as any,
        () => true,
        (level, message) => {
            if (level === "warn") warnings.push(message);
        },
        {
            routeContext: createDefaultRouteContext({
                getCapability: (id) => systemCtx.getCapability(id),
                flow: systemCtx.flow,
            }),
        },
    );
    try {
        await assert.rejects(
            () => extensions.refresh({ throwOnFailure: true }),
            /module_privileged_access_required/,
        );
        assert.equal(providerRegistered, false);

        privileged = true;
        await extensions.refresh({ throwOnFailure: true });
        assert.equal(providerRegistered, true);
        assert.ok(
            warnings.includes(
                "Untrusted external module requested privileged access.",
            ),
        );
        const warningCount = warnings.length;
        await writeFile(
            path.join(moduleRoot, ".cognis-install.json"),
            JSON.stringify({
                cloneUrl:
                    "https://github.com/Cognis-Labs-HQ/cognis-module-test-sso.git",
            }),
        );
        await extensions.refresh({ throwOnFailure: true });
        assert.equal(warnings.length, warningCount);
    } finally {
        if (previousModulesRoot === undefined)
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        else process.env.COGNIS_EXTERNAL_MODULES_ROOT = previousModulesRoot;
        await rm(modulesRoot, { recursive: true, force: true });
    }
});

test("module assurance detects installed-file tampering", async () => {
    const modulesRoot = await mkdtemp(path.join(tmpdir(), "cognis-modules-"));
    const moduleUuid = "936c7ea0-cdc8-4aaa-93f8-ad9d46250368";
    const moduleRoot = path.join(modulesRoot, moduleUuid);
    await mkdir(moduleRoot);
    const bootstrapSource = `export async function bootstrapModule(ctx) {
        globalThis.__moduleAssurance = await ctx.getModuleAssurance("assured-module");
    }`;
    await writeFile(path.join(moduleRoot, "bootstrap.js"), bootstrapSource);
    const manifest = {
        id: "assured-module",
        uuid: moduleUuid,
        version: "1.0.0",
        class: "extension",
        files: [
            {
                path: "bootstrap.js",
                sha256: createHash("sha256")
                    .update(bootstrapSource)
                    .digest("hex"),
            },
        ],
        entrypoints: { bootstrap: "./bootstrap.js" },
    };
    const rawManifest = JSON.stringify(manifest);
    await writeFile(path.join(moduleRoot, "manifest.json"), rawManifest);
    await writeFile(
        path.join(moduleRoot, ".cognis-install.json"),
        JSON.stringify({
            cloneUrl:
                "https://github.com/Cognis-Labs-HQ/cognis-module-assured.git",
            manifestSha256: createHash("sha256")
                .update(rawManifest)
                .digest("hex"),
        }),
    );
    const previousModulesRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = modulesRoot;
    const extensions = createModuleExtensionRoutes(
        { listManifests: async () => [manifest] } as any,
        () => true,
        undefined,
        { routeContext: createDefaultRouteContext() },
    );
    try {
        await extensions.refresh({ throwOnFailure: true });
        assert.equal(
            (globalThis as any).__moduleAssurance.integrity,
            "verified",
        );

        await writeFile(
            path.join(moduleRoot, "bootstrap.js"),
            `${bootstrapSource}\n// tampered`,
        );
        await extensions.refresh({ throwOnFailure: true });
        assert.equal((globalThis as any).__moduleAssurance.integrity, "failed");
    } finally {
        delete (globalThis as any).__moduleAssurance;
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
            ctx.registerAuthFooterPlugin({ scriptUrl: "/static/modules/owned-module/auth-footer.js" });
            ctx.registerSpaRoute({ id: "owned-module-page", pattern: "^/owned$", base: "/owned", scriptUrl: "/static/modules/owned-module/app.js", public: true, componentPage: { labelKey: "module.owned.page", descriptionKey: "module.owned.description", modes: ["fullscreen"] } });
            ctx.registerApiGet("/api/v1/modules/owned-module", (_req, res) => { res.writeHead(200); res.end("ok"); });
            ctx.registerApiGet("/api/v1/modules/owned-module/config", (_req, res) => { res.writeHead(ctx.getCapability("system:ctx") ? 500 : 200); res.end("config"); }, { allowWhenDisabled: true });
            return () => { throw new Error("expected teardown failure"); };
        }`,
    );
    await writeFile(
        path.join(moduleRoot, "disabled-api.js"),
        `export function registerDisabledApiRoutes(ctx) {
            ctx.registerApiGet("/api/v1/modules/owned-module/config", (_req, res) => { res.writeHead(ctx.getCapability("system:ctx") ? 500 : 200); res.end("config"); }, { allowWhenDisabled: true });
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
                    entrypoints: {
                        bootstrap: "./bootstrap.js",
                        disabledApi: "./disabled-api.js",
                    },
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
        assert.equal(uiRegistry.listSpaRoutes()[0].public, true);
        assert.equal(uiRegistry.listAuthFooterPlugins().length, 1);
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
        assert.equal(uiRegistry.listAuthFooterPlugins().length, 0);
        assert.deepEqual(uiRegistry.listAdminSections(), []);
        assert.deepEqual(
            (await systemCtx.runFlow("host-flow")).stageResults.extensions,
            [],
        );
        assert.equal(
            await extensions.handle(
                { method: "GET" } as any,
                {} as any,
                new URL("http://localhost/api/v1/modules/owned-module"),
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
                new URL("http://localhost/api/v1/modules/owned-module/config"),
            ),
            true,
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

test("unprivileged modules cooperate through provider-owned capabilities", async () => {
    const modulesRoot = await mkdtemp(path.join(tmpdir(), "cognis-modules-"));
    const whiteboardUuid = "93c08730-acde-4a13-ae5c-9bb176989ed4";
    const jitsiUuid = "ec69f234-5264-4db4-9bb3-95a170ac96f1";
    await mkdir(path.join(modulesRoot, whiteboardUuid));
    await mkdir(path.join(modulesRoot, jitsiUuid));
    await writeFile(
        path.join(modulesRoot, whiteboardUuid, "bootstrap.js"),
        `export function bootstrapModule(ctx) {
            ctx.contributePublicCapability("whiteboard:openBoard", (boardId) => ({ boardId, opened: true }));
        }`,
    );
    await writeFile(
        path.join(modulesRoot, jitsiUuid, "bootstrap.js"),
        `export function bootstrapModule(ctx) {
            const openBoard = ctx.getCapability("whiteboard:openBoard");
            globalThis.__cooperativeModuleResult = openBoard("planning");
        }`,
    );
    const previousModulesRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = modulesRoot;
    const systemCtx = createCtx();
    systemCtx.contributeCapability("system:ctx", systemCtx);
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "whiteboard",
                    uuid: whiteboardUuid,
                    entrypoints: { bootstrap: "./bootstrap.js" },
                },
                {
                    id: "jitsi",
                    uuid: jitsiUuid,
                    requiresCapabilities: ["whiteboard:openBoard"],
                    entrypoints: { bootstrap: "./bootstrap.js" },
                },
            ],
        } as any,
        () => true,
        undefined,
        {
            routeContext: createDefaultRouteContext({
                getCapability: (id) => systemCtx.getCapability(id),
                flow: systemCtx.flow,
            }),
        },
    );

    try {
        await extensions.refresh({ throwOnFailure: true });
        assert.deepEqual((globalThis as any).__cooperativeModuleResult, {
            boardId: "planning",
            opened: true,
        });
    } finally {
        delete (globalThis as any).__cooperativeModuleResult;
        if (previousModulesRoot === undefined) {
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        } else {
            process.env.COGNIS_EXTERNAL_MODULES_ROOT = previousModulesRoot;
        }
        await rm(modulesRoot, { recursive: true, force: true });
    }
});
