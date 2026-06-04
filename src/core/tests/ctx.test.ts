import test from "node:test";
import assert from "node:assert/strict";
import { createCtx } from "../ctx/index.js";

test("ctx contributes and resolves capabilities", () => {
    const ctx = createCtx();
    ctx.contributeCapability("auth:accountStore", { id: "store" });

    assert.equal(ctx.hasCapability("auth:accountStore"), true);
    assert.deepEqual(ctx.getCapability("auth:accountStore"), { id: "store" });
    assert.deepEqual(ctx.requireCapability("auth:accountStore"), {
        id: "store",
    });
});

test("ctx requireCapability throws when missing", () => {
    const ctx = createCtx();
    assert.throws(
        () => ctx.requireCapability("missing"),
        /Required capability "missing" is not available\./,
    );
});

test("ctx validates flow registration input", () => {
    const ctx = createCtx();

    assert.throws(
        () => ctx.registerFlow({ id: "", stages: ["start"] }),
        /Flow id must be a non-empty string\./,
    );
    assert.throws(
        () => ctx.registerFlow({ id: "login", stages: [] }),
        /must declare at least one stage/,
    );
    assert.throws(
        () => ctx.registerFlow({ id: "login", stages: ["start", "start"] }),
        /duplicate stage/,
    );

    ctx.registerFlow({ id: "login", stages: ["start", "authenticate"] });
    assert.throws(
        () => ctx.registerFlow({ id: "login", stages: ["a"] }),
        /already registered/,
    );
});

test("ctx lists, checks, and unregisters flows", () => {
    const ctx = createCtx();
    ctx.registerFlow({ id: "z-flow", stages: ["a"] });
    ctx.registerFlow({ id: "a-flow", stages: ["a"] });

    assert.equal(ctx.hasFlow("a-flow"), true);
    assert.deepEqual(ctx.listFlows(), ["a-flow", "z-flow"]);

    assert.equal(ctx.unregisterFlow("a-flow"), true);
    assert.equal(ctx.unregisterFlow("a-flow"), false);
    assert.deepEqual(ctx.listFlows(), ["z-flow"]);
});

test("ctx validates hook registration constraints", () => {
    const ctx = createCtx();
    ctx.registerFlow({ id: "login", stages: ["prepare"] });

    assert.throws(
        () =>
            ctx.addFlowStageHook(
                "missing",
                "prepare",
                { id: "hook" },
                () => undefined,
            ),
        /is not registered/,
    );

    assert.throws(
        () =>
            ctx.addFlowStageHook(
                "login",
                "missing",
                { id: "hook" },
                () => undefined,
            ),
        /does not declare stage/,
    );

    assert.throws(
        () =>
            ctx.addFlowStageHook(
                "login",
                "prepare",
                { id: "" },
                () => undefined,
            ),
        /hook id must be a non-empty string/,
    );

    ctx.addFlowStageHook("login", "prepare", { id: "hook" }, () => undefined);
    assert.throws(
        () =>
            ctx.addFlowStageHook(
                "login",
                "prepare",
                { id: "hook" },
                () => undefined,
            ),
        /already has hook/,
    );
});

test("ctx runs staged flow hooks in deterministic order", async () => {
    const ctx = createCtx();
    const callOrder: string[] = [];

    ctx.registerFlow({
        id: "login",
        stages: ["prepare", "authenticate", "finalize"],
    });

    ctx.addFlowStageHook("login", "prepare", { id: "z-last" }, (context) => {
        callOrder.push("prepare:z-last");
        context.data.method = "password";
        return "prepare-z";
    });

    ctx.addFlowStageHook(
        "login",
        "prepare",
        { id: "a-first", order: -1 },
        () => {
            callOrder.push("prepare:a-first");
            return "prepare-a";
        },
    );

    ctx.addFlowStageHook("login", "authenticate", { id: "auth" }, (context) => {
        callOrder.push("authenticate:auth");
        assert.equal(context.input, "alice");
        assert.equal(context.data.method, "password");
        context.data.authenticated = true;
        return { accountId: "alice" };
    });

    ctx.addFlowStageHook("login", "finalize", { id: "final" }, (context) => {
        callOrder.push("finalize:final");
        return context.data.authenticated === true;
    });

    const result = await ctx.runFlow("login", "alice", {
        meta: { source: "ui" },
        data: { initial: true },
    });

    assert.deepEqual(callOrder, [
        "prepare:a-first",
        "prepare:z-last",
        "authenticate:auth",
        "finalize:final",
    ]);
    assert.equal(result.data.initial, true);
    assert.equal(result.data.method, "password");
    assert.equal(result.data.authenticated, true);
    assert.deepEqual(result.stageResults.prepare, ["prepare-a", "prepare-z"]);
    assert.deepEqual(result.stageResults.authenticate, [
        { accountId: "alice" },
    ]);
    assert.deepEqual(result.stageResults.finalize, [true]);
});

test("ctx runFlow exposes frozen metadata and supports nested flows", async () => {
    const ctx = createCtx();

    ctx.registerFlow({ id: "ldap", stages: ["resolve"] });
    ctx.addFlowStageHook("ldap", "resolve", { id: "resolver" }, (context) => {
        assert.equal(context.meta.source, "login-ui");
        context.data.directory = "ldap";
        return "ok";
    });

    ctx.registerFlow({ id: "login", stages: ["authenticate"] });
    ctx.addFlowStageHook(
        "login",
        "authenticate",
        { id: "ldap-bridge" },
        async (context) => {
            assert.throws(() => {
                (context.meta as Record<string, unknown>).source = "tampered";
            });

            const nested = await context.ctx.runFlow("ldap", context.input, {
                meta: context.meta,
                data: context.data,
            });
            return nested.data.directory;
        },
    );

    const result = await ctx.runFlow(
        "login",
        { username: "alice" },
        {
            meta: { source: "login-ui" },
            data: {},
        },
    );

    assert.equal(result.data.directory, "ldap");
    assert.deepEqual(result.stageResults.authenticate, ["ldap"]);
});

test("ctx removeFlowStageHook detaches behavior", async () => {
    const ctx = createCtx();
    const executions: string[] = [];

    ctx.registerFlow({ id: "settings-page", stages: ["construct"] });
    ctx.addFlowStageHook("settings-page", "construct", { id: "base" }, () => {
        executions.push("base");
    });
    ctx.addFlowStageHook(
        "settings-page",
        "construct",
        { id: "ldap-inject" },
        () => {
            executions.push("ldap");
        },
    );

    assert.equal(
        ctx.removeFlowStageHook("settings-page", "construct", "ldap-inject"),
        true,
    );
    assert.equal(
        ctx.removeFlowStageHook("settings-page", "construct", "ldap-inject"),
        false,
    );
    assert.equal(ctx.removeFlowStageHook("missing", "construct", "x"), false);

    await ctx.runFlow("settings-page");
    assert.deepEqual(executions, ["base"]);
});

test("ctx runFlow throws when flow does not exist", async () => {
    const ctx = createCtx();
    await assert.rejects(() => ctx.runFlow("missing"), /is not registered/);
});

test("ctx public capabilities are separate from private capabilities", () => {
    const ctx = createCtx();

    ctx.contributeCapability("db:internal", { secret: true });
    ctx.contributePublicCapability("db:executor", { query: () => {} });
    ctx.contributePublicCapability("auth:routeContext", {
        requireAuth: () => {},
    });

    assert.equal(ctx.isPublicCapability("db:executor"), true);
    assert.equal(ctx.isPublicCapability("auth:routeContext"), true);
    assert.equal(ctx.isPublicCapability("db:internal"), false);
    assert.equal(ctx.isPublicCapability("missing"), false);
});

test("ctx listPublicCapabilities returns sorted list of public keys only", () => {
    const ctx = createCtx();

    ctx.contributeCapability("z:private", "private");
    ctx.contributePublicCapability("logging:logger", () => {});
    ctx.contributePublicCapability("db:executor", {});
    ctx.contributePublicCapability("auth:routeContext", {});

    const publicKeys = ctx.listPublicCapabilities();
    assert.deepEqual(publicKeys, [
        "auth:routeContext",
        "db:executor",
        "logging:logger",
    ]);
    assert.equal(publicKeys.includes("z:private"), false);
});

test("ctx public capabilities are still accessible via standard capability methods", () => {
    const ctx = createCtx();
    const executor = {
        query: () => Promise.resolve({ rows: [], rowCount: 0 }),
    };

    ctx.contributePublicCapability("db:executor", executor);

    assert.equal(ctx.hasCapability("db:executor"), true);
    assert.strictEqual(ctx.getCapability("db:executor"), executor);
    assert.strictEqual(ctx.requireCapability("db:executor"), executor);
});
