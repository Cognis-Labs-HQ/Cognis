import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../../api/reuse/ui-registry.js";
import { bootstrapSocialAdapter } from "../index.js";
import { makeTempDb } from "../routes/tests/helpers.js";

function makeInMemoryDb() {
    return {
        executeCommand: async (_command: unknown) => ({ rows: [] }),
        ensureTable: async (_def: unknown) => {},
        transaction: async (cb: (db: unknown) => Promise<unknown>) =>
            cb(makeInMemoryDb()),
    };
}

function makeAdapterCtx(
    overrides: {
        gatewayRegistry?: GatewayRegistry;
        routeRegistry?: RouteRegistry;
        capabilities?: CapabilityStore;
        uiRegistry?: UIRegistry;
    } = {},
) {
    const gatewayRegistry = overrides.gatewayRegistry ?? new GatewayRegistry();
    const routeRegistry = overrides.routeRegistry ?? new RouteRegistry();
    const capabilities = overrides.capabilities ?? new CapabilityStore();
    const uiRegistry = overrides.uiRegistry;
    if (!capabilities.get("db:executor")) {
        capabilities.contribute("db:executor", makeInMemoryDb());
    }
    const registeredAdapters: Array<{
        adapterId: string;
        adapterName: string;
    }> = [];
    const gateway = {
        registerAdapter(adapter: { adapterId: string; adapterName: string }) {
            registeredAdapters.push(adapter);
        },
    };
    return {
        ctx: {
            gateway,
            adapterId: "profile",
            adapterRoot: "/nonexistent",
            capabilities,
            gatewayRegistry,
            registerRoute: (
                handler: (
                    req: import("node:http").IncomingMessage,
                    res: import("node:http").ServerResponse,
                    url: URL,
                ) => Promise<boolean>,
                gatewayId?: string,
            ) => routeRegistry.register(handler, gatewayId ?? "social"),
            registerNavbarPlugin: (scriptUrl: string) =>
                uiRegistry?.registerNavbarPlugin({ scriptUrl }),
            registerStaticDir: (prefix: string, dir: string) =>
                uiRegistry?.registerStaticDir(prefix, dir),
            registerAdapterStaticDir: (gw: string, ad: string, dir: string) =>
                uiRegistry?.registerAdapterStaticDir(gw, ad, dir),
            registerAuthTypingMessage: (
                m: Parameters<UIRegistry["registerAuthTypingMessage"]>[0],
            ) => uiRegistry?.registerAuthTypingMessage(m),
            isGatewayEnabled: () => true,
        },
        gateway,
        registeredAdapters,
        gatewayRegistry,
        routeRegistry,
        capabilities,
        uiRegistry,
    };
}

test("profile adapter bootstrap contributes profile capabilities", async () => {
    const { ctx, capabilities } = makeAdapterCtx();
    await bootstrapSocialAdapter(ctx);

    assert.ok(
        capabilities.get("profile:createProfile"),
        "profile:createProfile capability must be contributed",
    );
    assert.ok(
        capabilities.get("profile:setRoleByHandle"),
        "profile:setRoleByHandle capability must be contributed",
    );
    assert.ok(
        capabilities.get("profile:getRole"),
        "profile:getRole capability must be contributed",
    );
    assert.ok(
        capabilities.get("preferences:store"),
        "preferences:store capability must be contributed",
    );
    assert.ok(
        capabilities.get("social:profileStore"),
        "social:profileStore capability must be contributed",
    );
    assert.ok(
        capabilities.get("social:profileLifecycle"),
        "social:profileLifecycle capability must be contributed",
    );
});

test("profile lifecycle capability creates a profile row when missing", async () => {
    const { dir, executor } = makeTempDb();
    try {
        const capabilities = new CapabilityStore();
        capabilities.contribute("db:executor", executor);
        const { ctx } = makeAdapterCtx({ capabilities });
        await bootstrapSocialAdapter(ctx);

        const lifecycle = capabilities.get<{
            getState(accountId: string): Promise<string>;
            setState(accountId: string, state: string): Promise<void>;
        }>("social:profileLifecycle");

        assert.ok(lifecycle, "social:profileLifecycle must be available");
        await lifecycle.setState("admin-created-user", "archived");

        assert.equal(
            await lifecycle.getState("admin-created-user"),
            "archived",
        );
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("profile adapter bootstrap registers static dir and navbar.js exists on disk", async () => {
    const uiRegistry = new UIRegistry();
    const { ctx } = makeAdapterCtx({ uiRegistry });
    await bootstrapSocialAdapter(ctx);

    const staticDir = uiRegistry.getAdapterStaticDir("social", "profile");
    assert.ok(
        staticDir,
        "profile adapter must register a static dir under social/profile",
    );

    await assert.doesNotReject(
        access(staticDir!),
        `static dir must exist on disk: ${staticDir}`,
    );

    const navbarPath = path.join(staticDir!, "navbar.js");
    await assert.doesNotReject(
        access(navbarPath),
        `navbar.js must exist in the registered static dir: ${navbarPath}`,
    );

    const navbarSource = readFileSync(navbarPath, "utf8");
    assert.match(
        navbarSource,
        /from ["']\.\/profile-avatar\.js["']/,
        "navbar avatar import must use a package-local path",
    );
    assert.doesNotMatch(
        navbarSource,
        /\/static\/gateways\/social\/profile-avatar\.js/,
        "navbar must not use the nonexistent legacy gateway static path",
    );
});

test("profile adapter bootstrap registers navbar plugin that resolves within static dir", async () => {
    const uiRegistry = new UIRegistry();
    const { ctx } = makeAdapterCtx({ uiRegistry });
    await bootstrapSocialAdapter(ctx);

    const plugins = uiRegistry.listNavbarPlugins();
    assert.ok(
        plugins.length > 0,
        "profile adapter must register at least one navbar plugin",
    );

    const staticDir = uiRegistry.getAdapterStaticDir("social", "profile");
    assert.ok(staticDir, "profile adapter must register an adapter static dir");

    const urlPrefix = "/static/adapters/social/profile/";
    for (const plugin of plugins) {
        assert.ok(
            plugin.scriptUrl.startsWith(urlPrefix),
            `navbar plugin scriptUrl must start with ${urlPrefix}, got: ${plugin.scriptUrl}`,
        );

        const filePart = plugin.scriptUrl.slice(urlPrefix.length);
        const resolvedPath = path.join(staticDir!, filePart);
        await assert.doesNotReject(
            access(resolvedPath),
            `file referenced by navbar plugin scriptUrl must exist on disk: ${resolvedPath}`,
        );
    }
});
