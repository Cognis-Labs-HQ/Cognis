import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

test("drawing conceals matching grid placements, including newly rendered previews, and restores their state", () => {
    let listener;
    let refresh;
    let disconnected = false;
    let released = false;
    const makePreview = (id, label) => {
        const classes = new Set();
        const attributes = new Map();
        return {
            dataset: { libraryEntry: id, libraryPreviewLabel: label },
            inert: false,
            classList: {
                add: (name) => classes.add(name),
                remove: (name) => classes.delete(name),
                contains: (name) => classes.has(name),
            },
            getAttribute: (name) => attributes.get(name) ?? null,
            setAttribute: (name, value) => attributes.set(name, value),
            removeAttribute: (name) => attributes.delete(name),
        };
    };
    const first = makePreview("cat", "猫");
    const duplicate = makePreview("cat", "猫");
    const variant = makePreview("cat", "猫たち");
    const other = makePreview("year", "年");
    let previews = [first, duplicate, variant, other];
    const environment = vm.createContext({
        uiCtx: {
            capabilities: {
                get: (name) => {
                    assert.equal(name, "study:drawing:observe");
                    return (callback) => {
                        listener = callback;
                        callback({ id: "cat", label: "猫" });
                        return () => {
                            released = true;
                        };
                    };
                },
            },
        },
        MutationObserver: class {
            constructor(callback) {
                refresh = callback;
            }

            observe() {}

            disconnect() {
                disconnected = true;
            }
        },
    });
    Object.assign(
        environment,
        loadTestModule(
            new URL("../../ui/app/drawing-grid-preview.js", import.meta.url),
            { "/static/reuse/ui-ctx.js": environment },
            environment,
        ),
    );
    const controller = new AbortController();
    environment.bindDrawingGridPreviews(
        { querySelectorAll: () => previews },
        controller.signal,
    );
    for (const preview of [first, duplicate]) {
        assert.equal(
            preview.classList.contains("library-entry-card--drawing"),
            true,
        );
        assert.equal(preview.inert, true);
        assert.equal(preview.getAttribute("aria-hidden"), "true");
    }
    assert.equal(variant.inert, false);
    assert.equal(other.inert, false);
    const replacement = makePreview("cat", "猫");
    previews = [replacement, other];
    refresh();
    assert.equal(first.inert, false);
    assert.equal(replacement.inert, true);
    listener({ id: "year", label: "年" });
    assert.equal(replacement.inert, false);
    assert.equal(other.inert, true);
    listener(null);
    assert.equal(other.inert, false);
    assert.equal(other.getAttribute("aria-hidden"), null);
    other.inert = true;
    other.setAttribute("aria-hidden", "false");
    listener({ id: "year", label: "年" });
    controller.abort();
    assert.equal(
        other.classList.contains("library-entry-card--drawing"),
        false,
    );
    assert.equal(other.inert, true);
    assert.equal(other.getAttribute("aria-hidden"), "false");
    assert.equal(disconnected, true);
    assert.equal(released, true);
});
