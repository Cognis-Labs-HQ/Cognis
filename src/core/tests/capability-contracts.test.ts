import assert from "node:assert/strict";
import test from "node:test";
import {
    createCtx,
    runBootstrapScope,
    registerBootstrapFlow,
    scopeCapabilityContracts,
    type BootstrapDisposer,
    type CapabilityContracts,
} from "../index.js";

const declaration = {
    version: 1,
    kind: "object" as const,
    description: "Example module API.",
    members: { read: "function" as const },
};

test("modules declare and resolve their own contracts without Core domain definitions", async () => {
    const ctx = createCtx();
    const contracts =
        ctx.requireCapability<CapabilityContracts>("system:contracts");
    const cleanup: BootstrapDisposer[] = [];
    ctx.contributePublicCapability(
        "example:cards",
        Object.freeze({ read: () => ["card"], privateValue: "secret" }),
    );
    await runBootstrapScope(
        ctx,
        "module:example",
        async () => contracts.define("example:cards", declaration),
        (dispose) => cleanup.push(dispose),
    );
    const api = contracts.resolve<{ read(): string[] }>("example:cards", 1);
    assert.deepEqual(api.read(), ["card"]);
    assert.equal(Reflect.get(api, "privateValue"), undefined);
    assert.equal(Reflect.get(api, "valueOf"), undefined);
    assert.equal(Object.getOwnPropertyDescriptor(api, "read"), undefined);
    assert.equal(Object.getPrototypeOf(api), null);
    assert.throws(
        () => contracts.resolve("example:cards", 2),
        /contract_unavailable/,
    );
    assert.throws(
        () => contracts.define("example:late", declaration),
        /bootstrap_registration_closed/,
    );
    await cleanup[0]();
    assert.throws(() => api.read(), /contract_unavailable/);
    await cleanup[0].reactivate!();
    assert.deepEqual(
        contracts.resolve<{ read(): string[] }>("example:cards", 1).read(),
        ["card"],
    );
});

test("contracts preserve scoped authorization, validate shapes and reject module namespace theft", async () => {
    const ctx = createCtx();
    const registry =
        ctx.requireCapability<CapabilityContracts>("system:contracts");
    ctx.contributePublicCapability("auth:register", () => "unrestricted");
    ctx.contributeCapability("auth:private", { read: () => "private" });
    await runBootstrapScope(ctx, "gateway:auth", async () => {
        registry.define("auth:register", {
            version: 1,
            kind: "function",
            description: "Register a provider.",
        });
        registry.define("auth:private", declaration);
    });
    const scoped = scopeCapabilityContracts(registry, () => () => {
        throw new Error("route_registration_denied");
    });
    const rebound = scopeCapabilityContracts(
        scoped,
        ctx.getCapability.bind(ctx),
    );
    assert.throws(
        () => rebound.resolve<() => void>("auth:register", 1)(),
        /route_registration_denied/,
    );
    assert.equal(registry.describe("auth:private"), undefined);
    assert.throws(
        () => registry.resolve("auth:private", 1),
        /contract_unavailable/,
    );
    await assert.rejects(
        runBootstrapScope(ctx, "module:example", async () =>
            registry.define("auth:stolen", declaration),
        ),
        /namespace_denied/,
    );
    ctx.contributePublicCapability("auth:register", {});
    assert.throws(
        () => registry.resolve("auth:register", 1),
        /contract_mismatch/,
    );
});

test("owned flows roll back and reactivate handlers while async contract handles are revoked", async () => {
    const ctx = createCtx();
    const cleanup: BootstrapDisposer[] = [];
    const registry =
        ctx.requireCapability<CapabilityContracts>("system:contracts");
    let finish!: (value: string) => void;
    ctx.contributePublicCapability(
        "example:read",
        () =>
            new Promise<string>((resolve) => {
                finish = resolve;
            }),
    );
    await runBootstrapScope(
        ctx,
        "module:example",
        async () => {
            registry.define("example:read", {
                version: 1,
                kind: "function",
                description: "Read asynchronously.",
            });
            const flow = registerBootstrapFlow(ctx, {
                id: "example:run",
                stages: ["read"],
            });
            flow.extend("read", { id: "example:handler" }, ({ data }) => {
                data.value = "executed";
            });
        },
        (dispose) => cleanup.push(dispose),
    );
    assert.equal((await ctx.flow.run("example:run")).data.value, "executed");
    const pending = registry.resolve<() => Promise<string>>(
        "example:read",
        1,
    )();
    for (const dispose of [...cleanup].reverse()) await dispose();
    for (const dispose of cleanup) await dispose.reactivate?.();
    finish("late");
    await assert.rejects(pending, /contract_unavailable/);
    assert.equal(ctx.flow.exists("example:run"), true);
    assert.equal((await ctx.flow.run("example:run")).data.value, "executed");
    await assert.rejects(
        runBootstrapScope(ctx, "module:failure", async () => {
            registerBootstrapFlow(ctx, { id: "failure:run", stages: ["read"] });
            throw new Error("failed");
        }),
        /failed/,
    );
    assert.equal(ctx.flow.exists("failure:run"), false);
});
