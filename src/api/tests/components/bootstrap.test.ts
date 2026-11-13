import path from "node:path";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { discoverCoreComponentDependencies } from "../../components/discovery.js";
import assert from "node:assert/strict";
import test from "node:test";
import {
    createCtx,
    runBootstrapScope,
    GatewayRegistry,
    type CapabilityContracts,
    type ModuleManifest,
} from "@cognis/core";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { installComponentManagement } from "../../components/bootstrap.js";

test("provider ownership and protection come from server registries, and management contracts have server lifetime", async () => {
    const ctx = createCtx();
    const registry = new UIRegistry();
    registry.registerModuleStaticDir("example", "/owned/example");
    registry.registerStaticDir("storage", "/owned/storage");
    registry.registerAdapterStaticDir("storage", "driver", "/owned/driver");
    registry.registerCapabilityProvider({
        scriptUrl: "/static/modules/example/provider.js",
        ownerId: "example",
        providesCapabilities: ["example:ready"],
    });
    await runBootstrapScope(ctx, "gateway:storage", async () => {
        registry.registerCapabilityProvider({
            scriptUrl: "/static/gateways/storage/provider.js",
            providesCapabilities: ["storage:ready"],
        });
    });
    await runBootstrapScope(ctx, "adapter:storage:driver", async () => {
        registry.registerCapabilityProvider({
            scriptUrl: "/static/adapters/storage/driver/provider.js",
            providesCapabilities: ["storage:driver"],
        });
    });
    const gateways = new GatewayRegistry();
    gateways.register({
        id: "storage",
        name: "Storage",
        version: "1",
        required: true,
    });
    const management = await installComponentManagement({
        ctx,
        uiRegistry: registry,
        gateways,
        routeContext: createDefaultRouteContext(),
        modules: {
            list: async () => [
                {
                    id: "example",
                    uuid: "11111111-1111-4111-8111-111111111111",
                    name: "module.example.name",
                    ui: { stringsBaseUrl: "/static/modules/example/languages" },
                    version: "2",
                    class: "extension",
                    coreApiVersion: "v1",
                    capabilities: [],
                    entrypoints: {},
                    required: true,
                    critical: true,
                } as ModuleManifest,
            ],
        },
        components: async () => [
            {
                id: "storage-driver",
                adapterId: "driver",
                gatewayId: "storage",
                version: "3",
            },
        ],
        handlers: () => [],
        log: () => {},
    });
    const descriptors = await management.capability.describeProviders(
        registry.listCapabilityProviders(),
        "capabilities",
    );
    assert.deepEqual(
        descriptors.map((item) => item.component),
        [
            {
                type: "module",
                id: "example",
                name: "module.example.name",
                stringsBaseUrl: "/static/modules/example/languages",
                version: "2",
                required: false,
            },
            {
                type: "gateway",
                id: "storage",
                name: "Storage",
                version: "1",
                required: true,
            },
            {
                type: "adapter",
                id: "driver",
                gatewayId: "storage",
                version: "3",
                required: false,
            },
        ],
    );
    const contracts =
        ctx.requireCapability<CapabilityContracts>("system:contracts");
    assert.equal(contracts.describe("component:management")?.version, 1);
    assert.equal(
        contracts.resolve<{ info: Function }>("component:management", 1)
            .info instanceof Function,
        true,
    );
    assert.equal(ctx.hasFlow("component:apply"), true);
    await management.dispose();
    assert.equal(ctx.hasFlow("component:apply"), false);
    assert.throws(
        () => contracts.resolve("component:management", 1),
        /capability_contract_unavailable/,
    );
});

test("Social provider owners use runtime IDs while retaining canonical manifest identity and version", async () => {
    const ctx = createCtx();
    const registry = new UIRegistry();
    const ids = ["profile", "messages", "call"];
    for (const id of ids) {
        registry.registerAdapterStaticDir(
            "social",
            id,
            path.resolve("src/adapters/social", id),
        );
        await runBootstrapScope(ctx, `adapter:social:${id}`, async () => {
            registry.registerCapabilityProvider({
                scriptUrl: `/static/adapters/social/${id}/provider.js`,
                providesCapabilities: [`social:${id}`],
            });
        });
    }
    const components = await discoverCoreComponentDependencies([
        path.resolve("src/adapters/social"),
    ]);
    const management = await installComponentManagement({
        ctx,
        routeContext: createDefaultRouteContext(),
        modules: { list: async () => [] },
        uiRegistry: registry,
        components: async () => components,
        handlers: () => [],
        log: () => {},
    });
    try {
        const providers = await management.capability.describeProviders(
            registry.listCapabilityProviders(),
            "capabilities",
        );
        for (const [index, id] of ids.entries()) {
            const manifest = JSON.parse(
                await readFile(
                    path.resolve("src/adapters/social", id, "manifest.json"),
                    "utf8",
                ),
            );
            assert.equal(
                components.find((entry) => entry.adapterId === id)?.id,
                manifest.id,
            );
            assert.deepEqual(providers[index].component, {
                type: "adapter",
                gatewayId: "social",
                id,
                version: manifest.version,
                name: manifest.name,
                required: false,
            });
        }
    } finally {
        await management.dispose();
    }
});

test("required and locked adapter providers retain their identity across aliases and descriptor resolution", async (context) => {
    const directory = await mkdtemp(path.join(tmpdir(), "provider-ownership-"));
    context.after(() => rm(directory, { recursive: true, force: true }));
    const manifestPath = path.join(directory, "assets.json");
    await writeFile(
        manifestPath,
        JSON.stringify({
            "/static/gateways/notify-internal/navbar-plugin.js":
                "/assets/internal.js",
            "/static/adapters/auth/keyring/provider.js": "/assets/keyring.js",
        }),
    );
    const ctx = createCtx();
    const registry = new UIRegistry(manifestPath);
    await runBootstrapScope(ctx, "adapter:notify:internal", async () => {
        registry.registerStaticDir("notify-internal", "/owned/internal");
        registry.registerNavbarPlugin({
            scriptUrl: "/static/gateways/notify-internal/navbar-plugin.js",
        });
    });
    await runBootstrapScope(ctx, "adapter:auth:keyring", async () => {
        registry.registerCapabilityProvider({
            scriptUrl: "/static/adapters/auth/keyring/provider.js",
            providesCapabilities: ["auth:keyring"],
            component: { type: "module", id: "forged", required: false },
        });
    });
    for (const id of ["local", "quota"]) {
        await runBootstrapScope(ctx, `adapter:files:${id}`, async () => {
            registry.registerCapabilityProvider({
                scriptUrl: `/assets/${id}.js`,
                providesCapabilities: [`files:${id}`],
            });
        });
    }
    const components = await discoverCoreComponentDependencies(
        [
            path.resolve("src/adapters/auth/keyring"),
            path.resolve("src/adapters/notify/internal"),
            path.resolve("src/adapters/file/local"),
            path.resolve("src/adapters/file/quota"),
        ],
        { adaptersRoot: path.resolve("src/adapters") },
    );
    const management = await installComponentManagement({
        ctx,
        routeContext: createDefaultRouteContext(),
        modules: { list: async () => [] },
        uiRegistry: registry,
        components: async () => components,
        handlers: () => [],
        log: () => {},
    });
    try {
        const providers = await management.capability.describeProviders(
            [
                ...registry.listNavbarPlugins(),
                ...registry.listCapabilityProviders(),
            ],
            "capabilities",
        );
        assert.equal(providers.length, 4);
        assert.deepEqual(
            providers.map((provider) => provider.scriptUrl),
            [
                "/assets/internal.js",
                "/assets/keyring.js",
                "/assets/local.js",
                "/assets/quota.js",
            ],
        );
        for (const provider of providers) {
            const owner = provider.component!;
            const component = components.find(
                (entry) =>
                    entry.adapterId === owner.id &&
                    entry.gatewayId === owner.gatewayId,
            );
            assert.equal(owner.type, "adapter");
            assert.equal(owner.gatewayId, component?.gatewayId);
            assert.equal(owner.name, component?.name);
            assert.equal(owner.version, component?.version);
            assert.equal(owner.required, true);
        }
        assert.equal(
            registry.listNavbarPlugins()[0].component?.id,
            "internal",
            "registration ownership survives after its bootstrap scope closes",
        );
    } finally {
        await management.dispose();
    }
});
