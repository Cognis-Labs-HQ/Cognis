import { createFavouriteFixture } from "./reuse/favourites-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";

test("favourite success toasts follow persisted add/remove state", async (testContext) => {
    let saved = [];
    const state = createFavouriteFixture(async (_url, options = {}) => {
        if (options.method === "PUT") {
            const item = JSON.parse(options.body);
            saved = item.favourite ? [{ kind: item.kind, id: item.id }] : [];
        }
        return Response.json({ data: saved });
    });
    testContext.after(() => state.controller.abort());
    const ctx = state.loadView();
    const toasts = state.notices;
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
