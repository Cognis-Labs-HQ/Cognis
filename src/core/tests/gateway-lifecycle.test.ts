import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    CapabilityStore,
    GatewayRegistry,
    GatewayService,
} from "../services/gateway-service.js";
import {
    requireBootstrapScope,
    type BootstrapDisposer,
} from "../ctx/bootstrap-scope.js";

test("gateway host retains bootstrap and completion resources across disable and reactivation", async (t) => {
    const directory = await mkdtemp(
        path.join(tmpdir(), "cognis-gateway-lifecycle-"),
    );
    t.after(() => rm(directory, { recursive: true, force: true }));
    const gatewayRoot = path.join(directory, "example");
    await mkdir(gatewayRoot);
    await cp(
        new URL("./fixtures/gateway-lifecycle/bootstrap.ts", import.meta.url),
        path.join(gatewayRoot, "bootstrap.ts"),
    );
    await writeFile(
        path.join(gatewayRoot, "manifest.json"),
        JSON.stringify({ id: "example" }),
    );
    const registry = new GatewayRegistry();
    const capabilities = new CapabilityStore();
    const root = {};
    capabilities.contribute("system:ctx", root);
    const events: string[] = [];
    for (const phase of ["bootstrap", "complete"])
        capabilities.contribute(`fixture:${phase}`, async () => {
            const scope = requireBootstrapScope(root);
            assert.equal(scope.owner, "gateway:example");
            events.push(phase);
            const dispose: BootstrapDisposer = () => {
                events.push(`dispose:${phase}`);
            };
            dispose.reactivate = () => {
                events.push(`activate:${phase}`);
            };
            scope.registerDisposer(dispose);
        });
    const service = new GatewayService(registry);
    await service.bootstrap(directory, {
        gatewayRegistry: registry,
        capabilities,
        flow: {} as never,
    });
    await service.disable("example");
    assert.equal(registry.get("example")?.status, "disabled");
    assert.deepEqual(events, [
        "bootstrap",
        "complete",
        "dispose:complete",
        "dispose:bootstrap",
    ]);
    await service.disable("example");
    assert.equal(events.length, 4);
    await service.enable("example");
    assert.equal(registry.get("example")?.status, "active");
    assert.deepEqual(events.slice(4), [
        "activate:bootstrap",
        "activate:complete",
    ]);
    assert.throws(
        () => requireBootstrapScope(root),
        /bootstrap_registration_closed/,
    );
});
