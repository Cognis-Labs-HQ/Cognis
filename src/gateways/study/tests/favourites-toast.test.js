import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
    const source = readFileSync(
        new URL("../ui/reuse/favourites.js", import.meta.url),
        "utf8",
    )
        .replace(/^import.*;$/gm, "")
        .replaceAll("export function", "function")
        .replaceAll("export async function", "async function");
    vm.runInContext(source, ctx);
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
