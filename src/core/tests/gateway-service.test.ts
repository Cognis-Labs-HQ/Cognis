import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
    CapabilityStore,
    GatewayRegistry,
    GatewayService,
} from "../services/gateway-service.js";

test("gateway bootstrap derives hasAdapters from adapter parent manifests", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-gateways-"));
    const gatewaysRoot = path.join(root, "gateways");
    const adaptersRoot = path.join(root, "adapters");
    const gatewayRoot = path.join(gatewaysRoot, "example");
    const adapterRoot = path.join(adaptersRoot, "example", "provider");
    await mkdir(gatewayRoot, { recursive: true });
    await mkdir(adapterRoot, { recursive: true });
    await writeFile(
        path.join(gatewayRoot, "manifest.json"),
        JSON.stringify({ id: "example", required: false }),
    );
    await writeFile(
        path.join(gatewayRoot, "bootstrap.ts"),
        'export async function bootstrap(ctx) { ctx.gatewayRegistry.register({ id: "example", name: "Example", version: "1.0.0" }); }',
    );
    await writeFile(
        path.join(adapterRoot, "manifest.json"),
        JSON.stringify({ id: "provider", gateway: "example" }),
    );
    const registry = new GatewayRegistry();
    const service = new GatewayService(registry);

    await service.bootstrap(gatewaysRoot, {
        adaptersRoot,
        gatewayRegistry: registry,
        capabilities: new CapabilityStore(),
        flow: {} as never,
    });

    assert.equal(registry.get("example")?.hasAdapters, true);
});
