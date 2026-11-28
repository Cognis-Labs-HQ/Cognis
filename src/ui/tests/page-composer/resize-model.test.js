import test from "node:test";
import assert from "node:assert/strict";
import {
    RESIZE_EDGES,
    resizePlacement,
} from "../../reuse/page-composer/resize-model.js";
import { resolveResizeAvailability } from "../../reuse/page-composer/resize-availability.js";
import { resolveElementGridSize } from "../../reuse/page-composer/grid-sizing.js";
import {
    buildOccupiedSet,
    checkPlacement,
} from "../../reuse/page-composer/grid-math.js";

const placement = { id: "card", col: 3, row: 3, w: 4, h: 4 };
const gridSize = resolveElementGridSize({
    gridSize: { default: [4, 4], min: [2, 2], max: [8, 8] },
});
function resize(direction, column, row, options = {}) {
    return resizePlacement({
        placement,
        gridSize,
        columns: 12,
        rows: 12,
        edge: RESIZE_EDGES.find((edge) => edge.direction === direction),
        delta: { col: column, row },
        ...options,
    });
}
for (const [direction, delta, expected] of [
    ["w", [-1, 0], [2, 3, 5, 4]],
    ["w", [1, 0], [4, 3, 3, 4]],
    ["n", [0, -1], [3, 2, 4, 5]],
    ["n", [0, 1], [3, 4, 4, 3]],
    ["e", [1, 0], [3, 3, 5, 4]],
    ["s", [0, 1], [3, 3, 4, 5]],
    ["nw", [-1, -1], [2, 2, 5, 5]],
    ["nw", [1, 1], [4, 4, 3, 3]],
    ["ne", [1, -1], [3, 2, 5, 5]],
    ["ne", [-1, 1], [3, 4, 3, 3]],
    ["sw", [-1, 1], [2, 3, 5, 5]],
    ["sw", [1, -1], [4, 3, 3, 3]],
    ["se", [1, 1], [3, 3, 5, 5]],
    ["se", [-1, -1], [3, 3, 3, 3]],
]) {
    test(`${direction} resizing by ${delta} preserves the opposite edges`, () => {
        const next = resize(direction, ...delta);
        assert.deepEqual([next.col, next.row, next.w, next.h], expected);
        assert.equal(next.id, placement.id);
        assert.deepEqual(placement, { id: "card", col: 3, row: 3, w: 4, h: 4 });
    });
}

test("left/top resizing respects origin, minimum and maximum dimensions", () => {
    assert.deepEqual(resize("nw", -100, -100), {
        id: "card",
        col: 0,
        row: 0,
        w: 7,
        h: 7,
    });
    assert.deepEqual(resize("nw", 100, 100), {
        id: "card",
        col: 5,
        row: 5,
        w: 2,
        h: 2,
    });
    const limited = resolveElementGridSize({
        gridSize: { default: [4, 4], min: [2, 2], max: [6, 6] },
    });
    assert.deepEqual(resize("nw", -100, -100, { gridSize: limited }), {
        id: "card",
        col: 1,
        row: 1,
        w: 6,
        h: 6,
    });
});

test("fractional left/top resizing retains half-grid alignment", () => {
    const options = {
        columns: 5,
        rows: 5,
        placement: { id: "card", col: 1, row: 1, w: 2, h: 2 },
        gridSize: resolveElementGridSize({
            gridSize: { default: [2, 2], min: [1, 1] },
        }),
    };
    assert.deepEqual(resize("nw", -0.4, 0.4, options), {
        id: "card",
        col: 0.5,
        row: 1.5,
        w: 2.5,
        h: 1.5,
    });
});

test("top/left collision checks preserve valid shrinking and directional cursors", () => {
    const occupied = buildOccupiedSet(
        [
            { id: "left", col: 0, row: 3, w: 3, h: 4 },
            { id: "above", col: 3, row: 0, w: 4, h: 3 },
        ],
        [],
    );
    const options = {
        placement,
        gridSize,
        columns: 12,
        rows: 12,
        canPlace: (column, row, width, height) =>
            checkPlacement(occupied, column, row, width, height),
    };
    let controls = resolveResizeAvailability(options);
    assert.equal(controls.west, "e-resize");
    assert.equal(controls.north, "s-resize");
    assert.equal(controls.northwest, "se-resize");
    controls = resolveResizeAvailability({
        ...options,
        gridSize: resolveElementGridSize({
            gridSize: { default: [4, 4], min: [4, 4] },
        }),
    });
    assert.equal(controls.west, null);
    assert.equal(controls.north, null);
    assert.equal(controls.northwest, null);
});
