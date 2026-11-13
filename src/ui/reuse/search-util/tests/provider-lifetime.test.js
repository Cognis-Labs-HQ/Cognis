import assert from "node:assert/strict";
import test from "node:test";
import { search } from "../capability.js";
import { uiCtx } from "../../ui-ctx.js";

test("the actual search stage completes with partial results when one provider hangs", async () => {
    let slowSignal;
    let fastCompleted = false;
    const removeSlow = search.registerAvenue("test-slow", {
        id: "slow",
        categoryId: "slow",
        stageId: "component-indexes",
        provider: ({ signal }) => {
            slowSignal = signal;
            return new Promise(() => {});
        },
    });
    const removeFast = search.registerAvenue("test-fast", {
        id: "fast",
        categoryId: "fast",
        stageId: "component-indexes",
        provider: () => {
            fastCompleted = true;
            return {
                category: "fast",
                items: [{ label: "Found", href: "/found" }],
            };
        },
    });
    uiCtx.extendFlow(
        "search",
        "component-indexes",
        { id: "test:provider-deadline" },
        (stage) => search.runStage(stage),
    );
    try {
        const run = uiCtx.runFlow("search", { query: "found" });
        await new Promise((resolve) => setImmediate(resolve));
        assert.equal(fastCompleted, true);
        assert.equal(slowSignal.aborted, false);
        const result = await run;
        assert.equal(slowSignal.aborted, true);
        assert.equal(slowSignal.reason.name, "TimeoutError");
        assert.match(
            JSON.stringify(result.stageResults["component-indexes"]),
            /Found/,
        );
    } finally {
        removeSlow();
        removeFast();
        uiCtx.removeFlowHook(
            "search",
            "component-indexes",
            "test:provider-deadline",
        );
    }
});

test("cancelled searches release uncooperative providers, including an already aborted query", async () => {
    const controller = new AbortController();
    let signal;
    let calls = 0;
    const avenue = {
        componentId: "test",
        categoryId: "test",
        id: "test",
        stageId: "component-indexes",
        provider: (context) => {
            calls++;
            signal = context.signal;
            return new Promise(() => {});
        },
    };
    const pending = search.runAvenue(avenue, {
        query: "old",
        signal: controller.signal,
    });
    await new Promise((resolve) => setImmediate(resolve));
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
    assert.equal(signal.aborted, true);
    await assert.rejects(
        search.runAvenue(avenue, { query: "new", signal: controller.signal }),
        { name: "AbortError" },
    );
    assert.equal(calls, 1);
});
