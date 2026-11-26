import assert from "node:assert/strict";
import test from "node:test";
import { sampleHiddenStrokes } from "../../ui/reuse/drawing-guidance.js";

test("the same hiding count selects fresh distinct stroke positions each attempt", () => {
    const first = sampleHiddenStrokes(6, 3, (values) => values.fill(0));
    const next = sampleHiddenStrokes(6, 3, (values) => values.fill(2));
    assert.deepEqual([...first], [0, 1, 2]);
    assert.deepEqual([...next], [2, 3, 4]);
    for (const hidden of [first, next, sampleHiddenStrokes(6, 3)]) {
        assert.equal(hidden.size, 3);
        assert.ok([...hidden].every((index) => index >= 0 && index < 6));
    }
    assert.deepEqual(
        [...sampleHiddenStrokes(2, 10, (values) => values.fill(1))].sort(),
        [0, 1],
    );
    assert.equal(sampleHiddenStrokes(5, 0).size, 0);
});
