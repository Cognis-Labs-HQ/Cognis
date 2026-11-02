import assert from "node:assert/strict";
import test from "node:test";
import {
    CapabilityStore,
    GatewayRegistry,
    createCtx,
    runBootstrapScope,
    type CapabilityContracts,
} from "@cognis/core";
import { bootstrapAdapter } from "../adapter-bootstrap.js";

function host() {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    const contracts =
        root.requireCapability<CapabilityContracts>("system:contracts");
    return { root, capabilities, contracts };
}

const contract = {
    version: 1,
    kind: "function" as const,
    description: "Reports provider readiness.",
};

test("gateway bootstrap exposes the registry and retains adapter-owned definitions through its lifecycle", async () => {
    const ctx = host();
    const gateways = new GatewayRegistry();
    gateways.register({ id: "example", name: "Example", version: "1.0.0" });
    await runBootstrapScope(
        ctx.root,
        "gateway:example",
        () =>
            bootstrapAdapter(
                "example",
                "provider",
                ctx,
                {
                    defineContracts(context: typeof ctx) {
                        context.capabilities
                            .require<CapabilityContracts>("system:contracts")
                            .define("example:ready", contract);
                    },
                },
                () =>
                    ctx.root.contributePublicCapability(
                        "example:ready",
                        () => true,
                    ),
            ),
        (dispose) => gateways.retainBootstrapDisposer("example", dispose),
    );
    assert.equal(
        ctx.contracts.describe("example:ready")?.owner,
        "adapter:example:provider",
    );
    const ready = ctx.contracts.resolve<() => boolean>("example:ready", 1);
    assert.equal(ready(), true);
    await gateways.disable("example");
    assert.throws(() => ready(), /contract_unavailable/);
    await gateways.enable("example");
    assert.equal(
        ctx.contracts.resolve<() => boolean>("example:ready", 1)(),
        true,
    );
    assert.throws(() => ready(), /contract_unavailable/);
    assert.throws(
        () => ctx.contracts.define("example:late", contract),
        /bootstrap_registration_closed/,
    );
});

test("failed adapter initialization rolls back its definitions while preserving another adapter", async () => {
    const ctx = host();
    ctx.root.contributePublicCapability("example:ready", () => true);
    ctx.root.contributePublicCapability("example:failed", () => true);
    await runBootstrapScope(ctx.root, "gateway:example", async () => {
        await bootstrapAdapter(
            "example",
            "first",
            ctx,
            {
                defineContracts: () =>
                    ctx.contracts.define("example:ready", contract),
            },
            async () => {},
        );
        await assert.rejects(
            bootstrapAdapter(
                "example",
                "failed",
                ctx,
                {
                    defineContracts: () =>
                        ctx.contracts.define("example:failed", contract),
                },
                async () => {
                    throw new Error("initialization_failed");
                },
            ),
            /initialization_failed/,
        );
        await assert.rejects(
            bootstrapAdapter(
                "example",
                "duplicate",
                ctx,
                {
                    defineContracts: () =>
                        ctx.contracts.define("example:ready", contract),
                },
                async () => {},
            ),
            /contract_conflict/,
        );
    });
    assert.equal(
        ctx.contracts.resolve<() => boolean>("example:ready", 1)(),
        true,
    );
    assert.throws(
        () => ctx.contracts.resolve("example:failed", 1),
        /contract_unavailable/,
    );
});

test("adapter definition hooks cannot bypass bootstrap timing or replace the host registry", async () => {
    const ctx = host();
    await assert.rejects(
        bootstrapAdapter("example", "provider", ctx, {}, async () => {}),
        /bootstrap_registration_closed/,
    );
    await runBootstrapScope(ctx.root, "gateway:example", async () => {
        await assert.rejects(
            bootstrapAdapter(
                "example",
                "invalid",
                ctx,
                { defineContracts: true },
                async () => {},
            ),
            /invalid_adapter_contract_definition/,
        );
        ctx.capabilities.contribute("system:contracts", {});
        await assert.rejects(
            bootstrapAdapter(
                "example",
                "invalidRegistry",
                ctx,
                {},
                async () => {},
            ),
            /adapter_contract_registry_conflict/,
        );
    });
});
