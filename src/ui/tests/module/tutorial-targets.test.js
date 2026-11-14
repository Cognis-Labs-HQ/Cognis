import test from "node:test";
import assert from "node:assert/strict";
import { mountProvider } from "../../app/modules/tutorials.js";
import { validateName } from "../../reuse/tutorials/schema.js";

test("module targets publish only their own active settings controls and preserve target identities", async (context) => {
    const previous = globalThis.document;
    context.after(() => {
        globalThis.document = previous;
    });
    const targets = new Map();
    const fields = new Map([
        ["apiKey", {}],
        ["voiceId", {}],
    ]);
    const actions = new Map([["voices", {}]]);
    const preview = {};
    let visible = true;
    const surface = {
        querySelector(selector) {
            if (selector === "form")
                return { elements: { namedItem: (key) => fields.get(key) } };
            if (selector.includes('"config:voices"'))
                return actions.get("voices");
            if (selector.startsWith("audio")) return preview;
            return null;
        },
    };
    const card = {};
    globalThis.document = {
        querySelectorAll: (selector) =>
            selector.includes('data-module-settings="example"')
                ? visible
                    ? [surface]
                    : []
                : [card],
        querySelector: (selector) =>
            selector.includes('data-module-settings="example"') && visible
                ? surface
                : null,
    };
    let api;
    let disposed = false;
    const controller = new AbortController();
    const ctx = {
        signal: controller.signal,
        capabilities: {
            get: () => ({
                owner: () => ({
                    target: async (id, options) => {
                        validateName(id);
                        targets.set(id, options);
                        return { id };
                    },
                    dispose: () => {
                        disposed = true;
                    },
                }),
            }),
            contribute: (_id, value) => {
                api = value;
            },
        },
    };
    const dispose = await mountProvider(ctx);
    assert.equal(
        (await api.card("example", { signal: controller.signal })).id,
        "example",
    );
    assert.equal(targets.get("example").resolve(), card);
    for (const key of fields.keys())
        await api.field("example", key, { signal: controller.signal });
    await api.action("example", "voices", { signal: controller.signal });
    const audio = await api.preview("example", { signal: controller.signal });
    assert.equal(
        targets.get("example.field.api-key").resolve(),
        fields.get("apiKey"),
    );
    assert.equal(
        targets.get("example.action.voices").resolve(),
        actions.get("voices"),
    );
    assert.equal(targets.get(audio.id).resolve(), preview);
    assert.equal(audio.popup, '[data-module-settings="example"]');
    assert.throws(
        () => api.field("example", '"injection', {}),
        /invalid_module_preference_key/,
    );
    visible = false;
    assert.equal(targets.get(audio.id).resolve(), null);
    const older = new AbortController();
    const newer = new AbortController();
    const release = api.bindSettings("example", { signal: older.signal });
    api.bindSettings("example", { signal: newer.signal });
    release();
    older.abort();
    assert.equal(api.settingsSignal("example"), newer.signal);
    newer.abort();
    assert.equal(api.settingsSignal("example"), undefined);
    dispose();
    assert.equal(disposed, true);
});
