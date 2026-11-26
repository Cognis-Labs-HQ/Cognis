import test from "node:test";
import assert from "node:assert/strict";
import { resolveResizeAvailability } from "../../reuse/page-composer/resize-availability.js";
import { resolveElementGridSize } from "../../reuse/page-composer/grid-sizing.js";
import {
    buildOccupiedSet,
    checkPlacement,
} from "../../reuse/page-composer/grid-math.js";

function availability({
    neighbours = [],
    hidden = [],
    size = { default: [2, 2], min: [2, 2] },
    placement = { id: "widget", col: 0, row: 0, w: 2, h: 2 },
    columns = 6,
    rows = 6,
} = {}) {
    const occupied = buildOccupiedSet(neighbours, hidden);
    return resolveResizeAvailability({
        placement,
        columns,
        rows,
        gridSize: resolveElementGridSize({ gridSize: size }),
        canPlace: (col, row, width, height) =>
            col + width <= columns &&
            checkPlacement(occupied, col, row, width, height),
    });
}
const right = { id: "right", col: 2, row: 0, w: 2, h: 2 };
const below = { id: "below", col: 0, row: 2, w: 2, h: 2 };
const corner = { id: "corner", col: 2, row: 2, w: 2, h: 2 };

test("occupied right and bottom tiles block every resize from minimum size", () => {
    assert.deepEqual(availability({ neighbours: [right, below] }), {
        east: null,
        south: null,
        southeast: null,
    });
});

test("each free axis is independent and the diagonal checks its own collision", () => {
    assert.deepEqual(availability({ neighbours: [right] }), {
        east: null,
        south: "s-resize",
        southeast: null,
    });
    assert.deepEqual(availability({ neighbours: [below] }), {
        east: "e-resize",
        south: null,
        southeast: null,
    });
    assert.deepEqual(availability({ neighbours: [corner] }), {
        east: "e-resize",
        south: "s-resize",
        southeast: null,
    });
    assert.deepEqual(availability(), {
        east: "e-resize",
        south: "s-resize",
        southeast: "se-resize",
    });
});

test("valid inward resizing remains possible beside neighbours", () => {
    assert.deepEqual(
        availability({
            neighbours: [right, below],
            size: { default: [2, 2], min: [1, 1] },
        }),
        { east: "w-resize", south: "n-resize", southeast: "nw-resize" },
    );
});

test("grid boundaries and fixed sizing constrain handles", () => {
    assert.deepEqual(availability({ columns: 2 }), {
        east: null,
        south: "s-resize",
        southeast: null,
    });
    assert.deepEqual(
        availability({ size: { default: [2, 2], min: [2, 2], max: [2, 2] } }),
        { east: null, south: null, southeast: null },
    );
    assert.deepEqual(
        availability({ size: { default: [2, 2], min: [1, 1], max: "full" } }),
        { east: null, south: "ns-resize", southeast: null },
    );
});

test("a numeric width limit does not suppress an unbounded height", () => {
    assert.deepEqual(
        availability({
            size: { default: [2, 2], min: [2, 2], max: [2, null] },
        }),
        { east: null, south: "s-resize", southeast: null },
    );
});

test("half-grid increments respect nearby obstacles", () => {
    const options = {
        columns: 5,
        size: { default: [2.5, 2], min: [2.5, 2] },
        placement: { id: "widget", col: 0, row: 0, w: 2.5, h: 2 },
    };
    assert.equal(
        availability({ ...options, neighbours: [{ ...right, col: 2.5 }] }).east,
        null,
    );
    assert.equal(
        availability({ ...options, neighbours: [{ ...right, col: 3 }] }).east,
        "e-resize",
    );
});

test("hidden tiles release the resize direction", () => {
    assert.deepEqual(
        availability({
            neighbours: [right, below],
            hidden: ["right", "below"],
        }),
        { east: "e-resize", south: "s-resize", southeast: "se-resize" },
    );
});

test("free edges advertise both growing and shrinking", () => {
    assert.deepEqual(availability({ size: { default: [2, 2], min: [1, 1] } }), {
        east: "ew-resize",
        south: "ns-resize",
        southeast: "nwse-resize",
    });
});

test("diagonal cursors identify the legal mixed-axis move", () => {
    assert.equal(
        availability({
            placement: { id: "widget", col: 0, row: 0, w: 2, h: 3 },
            neighbours: [
                { id: "right", col: 2, row: 2, w: 2, h: 1 },
                { id: "below", col: 0, row: 3, w: 2, h: 1 },
            ],
        }).southeast,
        "ne-resize",
    );
    assert.equal(
        availability({
            placement: { id: "widget", col: 0, row: 0, w: 3, h: 2 },
            neighbours: [
                { id: "right", col: 3, row: 0, w: 2, h: 2 },
                { id: "below", col: 2, row: 2, w: 1, h: 1 },
            ],
        }).southeast,
        "sw-resize",
    );
});
