import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import path from "node:path";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../api/route-registry.js";
import { UIRegistry } from "../../../api/ui-registry.js";
import { bootstrap } from "../bootstrap.js";

function makeInMemoryDb() {
    return {
        execute: async (_sql: string, _params?: unknown[]) => ({ rows: [] }),
    };
}

test("profile gateway bootstrap registers in GatewayRegistry", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as any,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
    });

    const gw = gatewayRegistry.get("profile");
    assert.ok(gw, "profile gateway should be registered");
    assert.equal(gw.id, "profile");
});

test("profile gateway bootstrap registers correct static dir and navbar.js exists on disk", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as any,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
    });

    const staticDir = uiRegistry.getStaticDir("profile");
    assert.ok(
        staticDir,
        "profile gateway must register a static dir with UIRegistry",
    );

    await assert.doesNotReject(
        access(staticDir),
        `static dir must exist on disk: ${staticDir}`,
    );

    const navbarPath = path.join(staticDir, "navbar.js");
    await assert.doesNotReject(
        access(navbarPath),
        `navbar.js must exist in the registered static dir: ${navbarPath}`,
    );
});

test("profile gateway bootstrap registers navbar plugin scriptUrl that resolves within static dir", async () => {
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    const capabilities = new CapabilityStore();
    const uiRegistry = new UIRegistry();

    await bootstrap({
        dbExecutor: makeInMemoryDb() as any,
        dbType: "sqlite",
        adaptersRoot: "/nonexistent",
        routeRegistry,
        gatewayRegistry,
        capabilities,
        uiRegistry,
    });

    const plugins = uiRegistry.listNavbarPlugins();
    assert.ok(
        plugins.length > 0,
        "profile gateway must register at least one navbar plugin",
    );

    const staticDir = uiRegistry.getStaticDir("profile");
    assert.ok(staticDir, "profile gateway must register a static dir");

    const urlPrefix = "/static/gateways/profile/";
    for (const plugin of plugins) {
        assert.ok(
            plugin.scriptUrl.startsWith(urlPrefix),
            `navbar plugin scriptUrl must start with ${urlPrefix}, got: ${plugin.scriptUrl}`,
        );

        const filePart = plugin.scriptUrl.slice(urlPrefix.length);
        const resolvedPath = path.join(staticDir, filePart);
        await assert.doesNotReject(
            access(resolvedPath),
            `file referenced by navbar plugin scriptUrl must exist on disk: ${resolvedPath}`,
        );
    }
});
