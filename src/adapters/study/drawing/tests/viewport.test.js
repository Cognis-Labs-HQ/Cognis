import assert from "node:assert/strict";
import test from "node:test";
import { drawingViewport } from "../ui/viewport.js";

test("drawing viewport preserves single-column geometry while resizing", () => {
    assert.deepEqual(drawingViewport({ width: 720, height: 160 }, 1), {
        x: 280,
        y: 0,
        width: 160,
        height: 160,
    });
    assert.deepEqual(drawingViewport({ width: 180, height: 500 }, 1), {
        x: 0,
        y: 160,
        width: 180,
        height: 180,
    });
});

test("drawing viewport preserves multi-column geometry while resizing", () => {
    assert.deepEqual(drawingViewport({ width: 900, height: 200 }, 3), {
        x: 150,
        y: 0,
        width: 600,
        height: 200,
    });
});
