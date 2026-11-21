import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture(options = {}) {
    const storage = new Map([["cognis_account", "reader"]]);
    const window = { location: { pathname: "/details/A" } };
    const { createFormDraftManager } = loadTestModule(
        new URL("../../reuse/page-composer/form-draft.js", import.meta.url),
        {},
        {
            Map,
            window,
            localStorage: {
                getItem: (key) => storage.get(key) ?? null,
                setItem: (key, value) => storage.set(key, value),
                removeItem: (key) => storage.delete(key),
            },
        },
    );
    const manager = createFormDraftManager({
        FORM_DRAFT_STORAGE_PREFIX: "draft",
        ...options,
    });
    const snapshot = (value) => new Map([["card", new Map([["text", value]])]]);
    const read = (id) =>
        manager.loadPersistedFormState(id).get("card")?.get("text");
    return { manager, snapshot, read, storage, window };
}

test("default draft paths retain their current-page and account scopes", () => {
    const state = fixture();
    state.manager.savePersistedFormState("form", state.snapshot("A draft"));
    state.window.location.pathname = "/details/B";
    assert.equal(state.read("form"), undefined);
    state.manager.savePersistedFormState("form", state.snapshot("B draft"));
    state.window.location.pathname = "/details/A";
    assert.equal(state.read("form"), "A draft");
    state.storage.set("cognis_account", "another-reader");
    assert.equal(state.read("form"), undefined);
});

test("an owned path resolver keeps read write and clear bound to the original resource", () => {
    const state = fixture({
        resolveStoragePath: (id) => `/details/${encodeURIComponent(id)}`,
    });
    state.manager.savePersistedFormState("A", state.snapshot("A draft"));
    assert.ok(state.storage.has("draft:reader:/details/A:A"));
    state.window.location.pathname = "/details/B";
    state.manager.savePersistedFormState("B", state.snapshot("B draft"));
    assert.equal(state.read("A"), "A draft");
    state.manager.clearPersistedFormState("A");
    assert.equal(state.read("A"), undefined);
    assert.equal(state.read("B"), "B draft");
    state.storage.set("cognis_account", "another-reader");
    state.manager.clearPersistedFormState("B");
    state.manager.savePersistedFormState(
        "A",
        state.snapshot("another account draft"),
    );
    state.storage.set("cognis_account", "reader");
    assert.equal(state.read("B"), "B draft");
    assert.equal(state.read("A"), undefined);
});

test("an owned resolver reads already saved canonical resource paths without migration", () => {
    const state = fixture({
        resolveStoragePath: (id) => `/details/${encodeURIComponent(id)}`,
    });
    state.storage.set(
        "draft:reader:/details/A:A",
        JSON.stringify({ card: { text: "existing draft" } }),
    );
    state.window.location.pathname = "/details/B";
    assert.equal(state.read("A"), "existing draft");
});
