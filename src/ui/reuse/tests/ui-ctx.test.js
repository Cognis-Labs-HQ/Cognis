import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function loadUiCtxForTests() {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/ui-ctx.js"),
        "utf8",
    );
    const testableSource = source
        .replace(/^import .*;\n/gm, "")
        .replace(/\bexport\s+/g, "");

    const context = {
        console,
        BROWSER_FLOW_CONTRACTS: {},
        createReuseResources: () => Object.freeze({}),
        __testExports: {},
    };
    vm.runInNewContext(
        testableSource +
            "\nglobalThis.__testExports = { createFlowEngine, uiCtx };\n",
        context,
    );
    return context.__testExports;
}

test("createFlowEngine — registerFlow and flowExists", () => {
    const { createFlowEngine } = loadUiCtxForTests();
    const engine = createFlowEngine();
    assert.equal(engine.flowExists("my-flow"), false);
    engine.registerFlow("my-flow", ["stage-a", "stage-b"]);
    assert.equal(engine.flowExists("my-flow"), true);
});

test("uiCtx initializes built-in flows before hook modules can extend them", async () => {
    const { uiCtx } = await import("../ui-ctx.js");
    assert.equal(uiCtx.flowExists("authenticate-session"), true);
    assert.equal(uiCtx.flowExists("load-page"), true);
    assert.equal(typeof uiCtx.capabilities.get("ui:reuse"), "object");
});

test("createFlowEngine — registering the same flow twice throws", () => {
    const { createFlowEngine } = loadUiCtxForTests();
    const engine = createFlowEngine();
    engine.registerFlow("dup-flow", ["s1"]);
    assert.throws(
        () => engine.registerFlow("dup-flow", ["s1"]),
        /already registered/i,
    );
});

test("createFlowEngine — runFlow executes hooks in stage order", async () => {
    const { createFlowEngine } = loadUiCtxForTests();
    const engine = createFlowEngine();
    engine.registerFlow("ordered-flow", ["alpha", "beta"]);

    const calls = [];
    engine.extendFlow("ordered-flow", "beta", { id: "hook-beta" }, async () => {
        calls.push("beta");
        return { ran: "beta" };
    });
    engine.extendFlow(
        "ordered-flow",
        "alpha",
        { id: "hook-alpha" },
        async () => {
            calls.push("alpha");
            return { ran: "alpha" };
        },
    );

    const result = await engine.runFlow("ordered-flow", {});
    assert.deepEqual(calls, ["alpha", "beta"]);
    assert.deepEqual(JSON.parse(JSON.stringify(result.stageResults["alpha"])), [
        { ran: "alpha" },
    ]);
    assert.deepEqual(JSON.parse(JSON.stringify(result.stageResults["beta"])), [
        { ran: "beta" },
    ]);
});

test("createFlowEngine — stageCtx.data is shared across hooks within the same run", async () => {
    const { createFlowEngine } = loadUiCtxForTests();
    const engine = createFlowEngine();
    engine.registerFlow("data-flow", ["write", "read"]);

    engine.extendFlow(
        "data-flow",
        "write",
        { id: "writer" },
        async (stageCtx) => {
            stageCtx.data.message = "hello";
        },
    );
    engine.extendFlow(
        "data-flow",
        "read",
        { id: "reader" },
        async (stageCtx) => {
            return { got: stageCtx.data.message };
        },
    );

    const result = await engine.runFlow("data-flow", {});
    assert.deepEqual(JSON.parse(JSON.stringify(result.stageResults["read"])), [
        { got: "hello" },
    ]);
});

test("createFlowEngine — runFlow on an unknown flow throws", async () => {
    const { createFlowEngine } = loadUiCtxForTests();
    const engine = createFlowEngine();
    await assert.rejects(
        () => engine.runFlow("ghost-flow", {}),
        /not registered/i,
    );
});

test("createFlowEngine — extendFlow on an unknown flow throws", () => {
    const { createFlowEngine } = loadUiCtxForTests();
    const engine = createFlowEngine();
    assert.throws(
        () =>
            engine.extendFlow("ghost-flow", "s1", { id: "h1" }, async () => {}),
        /not registered/i,
    );
});

test("createFlowEngine — extendFlow on an unknown stage throws", () => {
    const { createFlowEngine } = loadUiCtxForTests();
    const engine = createFlowEngine();
    engine.registerFlow("stage-flow", ["real-stage"]);
    assert.throws(
        () =>
            engine.extendFlow(
                "stage-flow",
                "ghost-stage",
                { id: "h1" },
                async () => {},
            ),
        /not a registered stage/i,
    );
});

test("createFlowEngine — multiple hooks in one stage accumulate results", async () => {
    const { createFlowEngine } = loadUiCtxForTests();
    const engine = createFlowEngine();
    engine.registerFlow("multi-flow", ["stage"]);

    engine.extendFlow("multi-flow", "stage", { id: "hook-1" }, async () => ({
        index: 1,
    }));
    engine.extendFlow("multi-flow", "stage", { id: "hook-2" }, async () => ({
        index: 2,
    }));

    const result = await engine.runFlow("multi-flow", {});
    assert.deepEqual(JSON.parse(JSON.stringify(result.stageResults["stage"])), [
        { index: 1 },
        { index: 2 },
    ]);
});

test("createFlowEngine — stageCtx.input is the original flow input", async () => {
    const { createFlowEngine } = loadUiCtxForTests();
    const engine = createFlowEngine();
    engine.registerFlow("input-flow", ["check"]);

    let received = null;
    engine.extendFlow(
        "input-flow",
        "check",
        { id: "checker" },
        async (stageCtx) => {
            received = stageCtx.input;
        },
    );

    await engine.runFlow("input-flow", { userId: "alice" });
    assert.deepEqual(received, { userId: "alice" });
});
