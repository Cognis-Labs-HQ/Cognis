import assert from "node:assert/strict";
import test from "node:test";
import { uiCtx } from "../ui-ctx.js";
import { createProviderLifecycle } from "../provider-lifecycle.js";
import { registerScopedUiActions } from "../scoped-actions.js";

test("scoped actions execute real flows and stale handles cannot run after teardown", async () => {
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
    await lifecycle.reconcile([]);
    assert.equal(uiCtx.flowExists("test:scopedActions:load"), false);
    await assert.rejects(actions.load({ value: 8 }), { name: "AbortError" });
    assert.equal(executions, 1);
});
