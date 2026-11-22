import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    CapabilityStore,
    GatewayRegistry,
    GatewayService,
} from "../services/gateway-service.js";
import { createCtx } from "../ctx/index.js";

async function createBootstrapFixture(
    t: import("node:test").TestContext,
    required = false,
) {
    const directory = await mkdtemp(path.join(tmpdir(), "gateway-failure-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const gatewayRoot = path.join(directory, "example");
    await mkdir(gatewayRoot);
    await writeFile(
        path.join(gatewayRoot, "manifest.json"),
        JSON.stringify({ id: "example", required }),
    );
    const root = createCtx();
    const registry = new GatewayRegistry();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    const service = new GatewayService(registry);
    return {
        registry,
        capabilities,
        bootstrap: () =>
            service.bootstrap(directory, {
                gatewayRegistry: registry,
                capabilities,
                flow: root.flow,
            }),
        install: () =>
            cp(
                new URL(
                    "./fixtures/gateway-lifecycle/bootstrap.ts",
                    import.meta.url,
                ),
                path.join(gatewayRoot, "bootstrap.ts"),
            ),
    };
}

test("known import failure retains policy evidence without executable identity", async (t) => {
    const fixture = await createBootstrapFixture(t);
    assert.equal(fixture.registry.hasBootstrapFailure("example"), false);
    await fixture.bootstrap();
    assert.equal(fixture.registry.hasBootstrapFailure("example"), true);
    assert.equal(fixture.registry.hasBootstrapFailure("absent"), false);
    assert.equal(fixture.registry.get("example"), undefined);
    assert.deepEqual(fixture.capabilities.list(), ["system:ctx"]);
    await fixture.bootstrap();
    assert.equal(fixture.registry.hasBootstrapFailure("example"), true);
    await fixture.install();
    fixture.capabilities.contribute("fixture:bootstrap", async () => {});
    fixture.capabilities.contribute("fixture:complete", async () => {});
    await fixture.bootstrap();
    assert.equal(fixture.registry.hasBootstrapFailure("example"), false);
});

test("body failure survives early registration and disable until complete successful retry", async (t) => {
    const fixture = await createBootstrapFixture(t);
    await fixture.install();
    fixture.capabilities.contribute("fixture:bootstrap", async () => {
        throw new Error("synthetic_body_failure");
    });
    await fixture.bootstrap();
    assert.equal(fixture.registry.hasBootstrapFailure("example"), true);
    await fixture.registry.disable("example");
    await fixture.registry.enable("example");
    assert.equal(fixture.registry.hasBootstrapFailure("example"), true);
    fixture.capabilities.contribute("fixture:bootstrap", async () => {
        assert.equal(fixture.registry.hasBootstrapFailure("example"), true);
    });
    fixture.capabilities.contribute("fixture:complete", async () => {
        assert.equal(fixture.registry.hasBootstrapFailure("example"), true);
        throw new Error("synthetic_completion_failure");
    });
    await assert.rejects(fixture.bootstrap(), /synthetic_completion_failure/);
    assert.equal(fixture.registry.hasBootstrapFailure("example"), true);
    fixture.capabilities.contribute("fixture:complete", async () => {
        assert.equal(fixture.registry.hasBootstrapFailure("example"), true);
    });
    await fixture.bootstrap();
    assert.equal(fixture.registry.hasBootstrapFailure("example"), false);
});

test("required gateway import failure records evidence and still aborts startup", async (t) => {
    const fixture = await createBootstrapFixture(t, true);
    await assert.rejects(
        fixture.bootstrap(),
        /Required gateway "example" failed during bootstrap/,
    );
    assert.equal(fixture.registry.hasBootstrapFailure("example"), true);
    assert.throws(
        () => fixture.registry.assertRequiredInitialized(["example"]),
        /did not initialize/,
    );
});

test("a discovered module without bootstrap export records failure", async (t) => {
    const directory = await mkdtemp(path.join(tmpdir(), "gateway-no-export-"));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const gatewayRoot = path.join(directory, "example");
    await mkdir(gatewayRoot);
    await writeFile(
        path.join(gatewayRoot, "manifest.json"),
        JSON.stringify({ id: "example" }),
    );
    await cp(
        new URL(
            "./fixtures/gateway-without-bootstrap/bootstrap.ts",
            import.meta.url,
        ),
        path.join(gatewayRoot, "bootstrap.ts"),
    );
    const registry = new GatewayRegistry();
    const root = createCtx();
    await new GatewayService(registry).bootstrap(directory, {
        gatewayRegistry: registry,
        capabilities: new CapabilityStore(),
        flow: root.flow,
    });
    assert.equal(registry.hasBootstrapFailure("example"), true);
    assert.equal(registry.get("example"), undefined);
});
