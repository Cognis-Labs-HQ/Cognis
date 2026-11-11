import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { replaceMountScope } from "../../../../ui/reuse/mount-scope.js";

function fixture({ openingScope = (_target, signal) => signal } = {}) {
    const pending = [];
    const updates = [];
    const toasts = [];
    const details = [];
    const page = new AbortController();
    const context = vm.createContext({
        replaceMountScope,
        window: new EventTarget(),
        bindSelectionEscape() {},
        bindDrawingGridPreviews() {},
        bindViewedEntries: () => () => {},
        closeUnrelatedVariantViews: () => false,
        loadDrawing: async () => false,
        openEntryPopup: (...args) => {
            const deferred = Promise.withResolvers();
            details.push({ ...deferred, signal: args[6] });
            return deferred.promise;
        },
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
                "/static/reuse/ui-ctx.js": {
                    uiCtx: {
                        capabilities: {
                            get: (id) =>
                                id === "study:libraryTutorials"
                                    ? { openingSignal: openingScope }
                                    : undefined,
                        },
                    },
                },
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
        classList: { contains: () => false },
    });
    const bind = () =>
        context.bindLibraryInteractions(root, {
            i18n: { t: (key) => key },
            entries: [{ id: "card", schemaId: "schema", layer: "words" }],
            schemas: [{ id: "schema", layers: [{ id: "words" }] }],
            signal: page.signal,
        });
    const control = {
        dataset: { libraryEntry: "card" },
        closest(selector) {
            return selector === "[data-library-entry]" ? this : null;
        },
        matches: () => false,
    };
    const click = () => {
        const event = new Event("click");
        Object.defineProperty(event, "target", { value: control });
        root.dispatchEvent(event);
    };
    return {
        pending,
        updates,
        toasts,
        bind,
        click,
        details,
        close: () => page.abort(),
    };
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

test("card openings serialize active attempts, allow immediate retries after cancellation and ignore stale completion", async (context) => {
    let branch = new AbortController();
    const state = fixture({
        openingScope: (_target, pageSignal) =>
            AbortSignal.any([pageSignal, branch.signal]),
    });
    context.after(state.close);
    state.bind();
    state.pending[0].resolve({ writable: [] });
    const tick = () => new Promise(setImmediate);
    state.click();
    await tick();
    assert.equal(state.details.length, 1);
    state.click();
    await tick();
    assert.equal(
        state.details.length,
        1,
        "an active opening still blocks duplicate clicks",
    );
    branch.abort();
    assert.equal(state.details[0].signal.aborted, true);
    branch = new AbortController();
    state.click();
    await tick();
    assert.equal(
        state.details.length,
        2,
        "cancelled work must not block a new attempt",
    );
    assert.equal(state.details[1].signal.aborted, false);
    state.details[0].resolve();
    await tick();
    state.click();
    await tick();
    assert.equal(
        state.details.length,
        2,
        "stale completion must not release the newer opening lock",
    );
    state.details[1].reject(new Error("entry_failed"));
    await tick();
    assert.equal(
        state.toasts.length,
        1,
        "real failures must still be reported",
    );
    assert.equal(state.toasts[0][0], "gateway.study.library_load_error");
});
