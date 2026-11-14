import assert from "node:assert/strict";
import test from "node:test";
import { createAdapterConfigPopup } from "../../app/administration/adapter-config-popup.js";

test("cancelled adapter preparation never opens a late editor", async () => {
    const controller = new AbortController();
    let settle;
    const pending = new Promise((resolve) => {
        settle = resolve;
    });
    const popup = createAdapterConfigPopup({
        apiFetch: async (_url, options) => {
            assert.equal(options.signal, controller.signal);
            return pending;
        },
        openPopup: () =>
            assert.fail("cancelled preparation must not open settings"),
    });
    const opening = popup.openAdapterConfig("Example", {
        configUrl: "/api/config",
        signal: controller.signal,
    });
    controller.abort();
    settle(Response.json({ data: {} }));
    assert.equal(await opening, false);
});
