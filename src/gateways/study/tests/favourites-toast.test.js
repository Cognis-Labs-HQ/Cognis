import * as offlineReadCache from "../../../ui/reuse/offline-read-cache.js";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

test("favourite success toasts follow persisted add/remove state", async () => {
    let saved = [];
    const toasts = [];
    const ctx = vm.createContext({
        apiFetch: async (_url, options) => {
            if (options?.method === "PUT") {
                const item = JSON.parse(options.body);
                saved = item.favourite
                    ? [{ kind: item.kind, id: item.id }]
                    : [];
            }
            return { ok: true, json: async () => ({ data: saved }) };
        },
        showToast: (message) => toasts.push(message),
    });
    Object.assign(
        ctx,
        loadTestModule(
            new URL("../ui/reuse/favourites.js", import.meta.url),
            {
                "/static/reuse/offline-read-cache.js": offlineReadCache,
                "/static/reuse/api-client.js": ctx,
                "/static/reuse/escape-html.js": ctx,
                "/static/reuse/toast.js": ctx,
            },
            ctx,
        ),
    );
    const controller = await ctx.loadFavourites();
    let handler;
    const button = {
        dataset: { studyFavouriteKind: "deck", studyFavourite: "one" },
        disabled: false,
    };
    const root = {
        querySelectorAll: () => [],
        addEventListener: (_event, callback) => {
            handler = callback;
        },
    };
    controller.bind(root, { i18n: { t: (key) => key } });
    const event = { target: { closest: () => button }, stopPropagation() {} };
    await handler(event);
    assert.equal(controller.has("deck", "one"), true);
    await handler(event);
    assert.equal(controller.has("deck", "one"), false);
    assert.deepEqual(toasts, [
        "gateway.study.favourite_added",
        "gateway.study.favourite_removed",
    ]);
    assert.equal(button.disabled, false);
});
