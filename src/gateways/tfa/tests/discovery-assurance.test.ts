import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, copyFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
    CapabilityStore,
    GatewayRegistry,
    createCtx,
    runBootstrapScope,
} from "@cognis/core";
import { CoreTfaGateway } from "../gateway.js";
import { bootstrap } from "../bootstrap/index.js";
import { createStoreMock } from "./reuse/gateway-fixture.js";

for (const metadata of ["missing", "malformed"]) {
    test(`${metadata} optional publisher metadata preserves the discovered factor`, async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "tfa-discovery-"));
        try {
            const adapterRoot = path.join(directory, "proof");
            await mkdir(adapterRoot);
            for (const file of ["provider.js", "package.json"]) {
                await copyFile(
                    new URL(`./fixtures/discovery/${file}`, import.meta.url),
                    path.join(adapterRoot, file),
                );
            }
            if (metadata === "malformed")
                await writeFile(
                    path.join(adapterRoot, "manifest.json"),
                    "{invalid-json",
                );
            const store = createStoreMock();
            const gateway = new CoreTfaGateway(store);
            await gateway.discoverAdapters(directory);
            await gateway.loadPersistedConfigs();
            await store.upsertUserMethod({
                accountId: "alice",
                methodId: "discovery-proof",
                enabled: true,
                sortOrder: 0,
                state: {},
            });
            assert.equal(
                (await gateway.getUserStatus("alice")).hasConfiguredMethod,
                true,
            );
            assert.deepEqual(
                (await gateway.getLoginMethods("alice")).map(
                    (method) => method.id,
                ),
                ["discovery-proof"],
            );
            assert.equal(
                (
                    await gateway.verifyLogin("alice", "discovery-proof", {
                        code: "123456",
                    })
                ).verified,
                true,
            );
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
}

test("failed TFA initialization retains its known policy identity without assessment authority", async () => {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const gatewayRegistry = new GatewayRegistry();
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("db:executor", {
        ensureTable: async () => {
            throw new Error("synthetic_schema_failure");
        },
    });
    await assert.rejects(
        runBootstrapScope(root, "gateway:tfa", () =>
            bootstrap({
                capabilities,
                gatewayRegistry,
                flow: root.flow,
                adaptersRoot: "/unused",
                routeRegistry: new RouteRegistry(),
            }),
        ),
    );
    assert.equal(gatewayRegistry.get("tfa")?.status, "active");
    assert.equal(capabilities.get("tfa:assessSession"), undefined);
});

test("late TFA bootstrap failure removes completion routes and assessment flows", async () => {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    const gatewayRegistry = new GatewayRegistry();
    const routeRegistry = new RouteRegistry();
    capabilities.contribute("system:ctx", root);
    capabilities.contribute("auth:requireAuth", () => null);
    capabilities.contribute("db:executor", {
        ensureTable: async () => {},
        executeCommand: async () => ({ rows: [] }),
    });
    await assert.rejects(
        runBootstrapScope(root, "gateway:tfa", () =>
            bootstrap({
                capabilities,
                gatewayRegistry,
                routeRegistry,
                flow: root.flow,
                adaptersRoot: "/missing-offline-fixture",
                log: (level) => {
                    if (level === "info")
                        throw new Error("synthetic_late_bootstrap_failure");
                },
            }),
        ),
        /synthetic_late_bootstrap_failure/,
    );
    assert.equal(routeRegistry.getEntries().length, 0);
    assert.equal(root.flow.exists("tfa:assessSession"), false);
    const assessment =
        capabilities.require<
            (input: { accountId: string }) => Promise<{ outcome: string }>
        >("tfa:assessSession");
    assert.equal(
        (await assessment({ accountId: "alice" })).outcome,
        "tfa_unavailable",
    );
    assert.equal(gatewayRegistry.get("tfa")?.status, "active");
    await gatewayRegistry.disable("tfa");
    assert.equal(gatewayRegistry.get("tfa")?.status, "disabled");
    await gatewayRegistry.enable("tfa");
    assert.equal(
        (await assessment({ accountId: "alice" })).outcome,
        "tfa_unavailable",
    );
});
