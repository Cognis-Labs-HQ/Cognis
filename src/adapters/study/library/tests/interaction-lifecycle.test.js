import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { replaceMountScope } from "../../../../ui/reuse/mount-scope.js";

function fixture() {
    const pending = [];
    const updates = [];
    const toasts = [];
    const context = vm.createContext({
        replaceMountScope,
        window: new EventTarget(),
        bindSelectionEscape() {},
        bindDrawingGridPreviews() {},
        bindViewedEntries() {},
        bindVariantInteractions() {},
        bindTransformationInteractions() {},
        createLibraryVisibilityActions: () => ({}),
        setSelectionMode() {},
        fetchLibraryLocations: () =>
            new Promise((resolve, reject) => pending.push({ resolve, reject })),
        updateSelectionActions: (...args) => updates.push(args),
        showToast: (...args) => toasts.push(args),
    });
    Object.assign(
        context,
        loadTestModule(
            new URL("../ui/app/interactions.js", import.meta.url),
            {
                "./drawing-grid-preview.js": context,
                "./viewed-entries.js": context,
                "/static/reuse/mount-scope.js": context,
                "/static/reuse/toast.js": context,
                "/static/gateways/study/offline-content.js": {
                    isOfflineContentMiss: () => false,
                },
                "/static/gateways/study/library-client.js": context,
                "./filters.js": context,
                "./layer-cards.js": context,
                "./entry-popup.js": context,
                "./drawing.js": context,
                "./selection.js": context,
                "./variants.js": context,
                "./visibility-actions.js": context,
                "./transformation-interactions.js": context,
                "./entry-collection.js": context,
                "./deletion-actions.js": context,
                "./browse-controls.js": context,
            },
            context,
        ),
    );
    const root = Object.assign(new EventTarget(), {
        querySelector: () => null,
    });
    const bind = () =>
        context.bindLibraryInteractions(root, {
            i18n: { t: (key) => key },
            entries: [],
            schemas: [],
        });
    return { pending, updates, toasts, bind };
}

test("remounting prevents late Library responses from changing the current selection controls", async () => {
    const state = fixture();
    state.bind();
    state.bind();
    state.pending[0].resolve({ writable: ["old"] });
    state.pending[1].resolve({ writable: ["current"] });
    await new Promise(setImmediate);
    assert.equal(state.updates.length, 1);
    assert.deepEqual(state.updates[0][3], { writable: ["current"] });
});

test("Library location failures surface only for the active mount", async () => {
    const state = fixture();
    state.bind();
    state.bind();
    state.pending[0].reject(new Error("stale_failure"));
    state.pending[1].reject(new Error("network_failure"));
    await new Promise(setImmediate);
    assert.equal(state.toasts.length, 1);
    assert.equal(state.toasts[0][0], "gateway.study.library_load_error");
    assert.equal(state.toasts[0][1].variant, "error");
});
