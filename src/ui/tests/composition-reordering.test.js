import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const source = readFileSync(
    new URL("../reuse/composition-input.js", import.meta.url),
    "utf8",
)
    .replace(/import[\s\S]*?from "[^"]+";\n/g, "")
    .replace(/\bexport /g, "");
test("pointer dragging reorders one placement and prevents text selection", () => {
    const listeners = {};
    const field = { dataset: { compositionKind: "input" } };
    const token = (index) => ({
        dataset: { compositionIndex: String(index) },
        classList: { add() {}, remove() {} },
        closest: (selector) =>
            selector === "[data-composition-kind]" ? field : null,
    });
    const from = token(2),
        to = token(0);
    to.closest = (selector) =>
        selector === "[data-composition-kind]" ? field : to;
    let moved,
        prevented = false,
        captured = false;
    const context = { document: { elementFromPoint: () => to } };
    vm.runInNewContext(source, context);
    const root = {
        addEventListener: (name, listener) => {
            listeners[name] = listener;
        },
        querySelectorAll: () => [],
        setPointerCapture: () => {
            captured = true;
        },
        hasPointerCapture: () => captured,
        releasePointerCapture: () => {
            captured = false;
        },
    };
    context.bindCompositionReordering(root, {
        onMove: (detail) => {
            moved = detail;
        },
    });
    listeners.pointerdown({
        target: {
            closest: (selector) => (selector === "button" ? null : from),
        },
        pointerId: 1,
        button: 0,
        clientX: 200,
        preventDefault: () => {
            prevented = true;
        },
    });
    listeners.pointermove({ pointerId: 1, clientX: 10, clientY: 20 });
    listeners.pointerup({ pointerId: 1 });
    assert.equal(prevented, true);
    assert.equal(captured, false);
    assert.equal(
        JSON.stringify(moved),
        JSON.stringify({ kind: "input", from: 2, to: 0 }),
    );
});
