import assert from "node:assert/strict";
import test from "node:test";
import { uiCtx } from "../ui-ctx.js";
import { createProviderLifecycle } from "../provider-lifecycle.js";
import { registerScopedUiActions } from "../scoped-actions.js";

test("scoped actions expose adjustable stages, vetoes and lifecycle-safe handles", async () => {
    let executions = 0;
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => ({
            mountProvider(ctx) {
                ctx.capabilities.contribute(
                    "test:scopedActions",
                    registerScopedUiActions(ctx, "test:scopedActions", {
                        load: async ({ value }) => {
                            executions += 1;
                            return value;
                        },
                    }),
                );
            },
        }),
    });
    await lifecycle.reconcile([{ scriptUrl: "/scoped-actions.js" }]);
    const actions = uiCtx.capabilities.get("test:scopedActions");
    assert.equal(await actions.load({ value: 7 }), 7);
    assert.equal(executions, 1);
    uiCtx.extendFlow(
        "test:scopedActions:load",
        "before",
        { id: "adjust" },
        ({ input }) => {
            if (input.value === 8) throw new Error("veto");
            input.value *= 2;
        },
    );
    uiCtx.extendFlow(
        "test:scopedActions:load",
        "after",
        { id: "adjust" },
        ({ data }) => {
            data.result += 1;
        },
    );
    assert.equal(await actions.load({ value: 3 }), 7);
    await assert.rejects(actions.load({ value: 8 }), /veto/);
    assert.equal(executions, 2);
    await lifecycle.reconcile([]);
    assert.equal(uiCtx.flowExists("test:scopedActions:load"), false);
    await assert.rejects(actions.load({ value: 8 }), { name: "AbortError" });
    assert.equal(executions, 2);
});
