import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { createProviderLifecycle } from "../../../../ui/reuse/provider-lifecycle.js";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";

test("drawing resources and contributed actions follow provider lifetime", async () => {
    const signals = [];
    const provider = loadTestModule(
        new URL("../ui/provider.js", import.meta.url),
        {
            "/static/gateways/study/reuse/drawing.js": {
                openDrawingPad: async (payload) => {
                    signals.push(payload.signal);
                    return payload;
                },
                loadDrawingPad: async () => true,
            },
            "/static/gateways/study/reuse/drawing-state.js": {
                observeDrawingCard: (_listener, { signal }) =>
                    signals.push(signal),
            },
        },
        { AbortSignal },
    );
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => provider,
    });
    await lifecycle.reconcile([{ scriptUrl: "/drawing.js" }]);
    const open = uiCtx.capabilities.get("study:drawing:open");
    const observe = uiCtx.capabilities.get("study:drawing:observe");
    await open({ card: { id: "cached" } });
    observe(() => {});
    assert.ok(signals.every((signal) => !signal.aborted));
    await lifecycle.reconcile([]);
    assert.ok(signals.every((signal) => signal.aborted));
    assert.throws(() => open({}), { name: "AbortError" });
    await lifecycle.reconcile([{ scriptUrl: "/drawing.js" }]);
    const payload = await uiCtx.capabilities.get("study:drawing:open")({
        card: { id: "next" },
    });
    assert.equal(payload.signal.aborted, false);
    await lifecycle.reconcile([]);
});
