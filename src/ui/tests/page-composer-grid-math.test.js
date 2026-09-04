import test from "node:test";
import assert from "node:assert/strict";
import {
    buildOccupiedSet,
    checkPlacement,
    gridStep,
    halfGrid,
    registerOccupiedPlacement,
    snapGridFloor,
    snapGridRound,
} from "../reuse/page-composer/grid-math.js";

test("grid math handles even and odd dimensions", () => {
    assert.equal(gridStep(8), 1);
    assert.equal(gridStep(9), 0.5);
    assert.equal(halfGrid(8), 4);
    assert.equal(halfGrid(9), 4.5);
});

test("grid snapping rounds and floors on half-step grids", () => {
    assert.equal(snapGridFloor(205, 9), 2);
    assert.equal(snapGridFloor(206, 9), 2);
    assert.equal(snapGridRound(2.24, 9), 2);
    assert.equal(snapGridRound(2.26, 9), 2.5);
});

test("occupied set honors hidden and excluded placements", () => {
    const placements = [
        { id: "a", col: 0, row: 0, w: 1, h: 1 },
        { id: "b", col: 1, row: 0, w: 1, h: 1 },
        { id: "c", col: 0, row: 1, w: 1, h: 1 },
    ];
    const occupied = buildOccupiedSet(placements, ["b"], "c");

    assert.equal(occupied.has("0,0"), true);
    assert.equal(occupied.has("1,0"), true);
    assert.equal(occupied.has("2,0"), false);
    assert.equal(occupied.has("0,2"), false);
});

test("placement checks detect collisions and free slots", () => {
    const occupied = buildOccupiedSet(
        [{ id: "x", col: 1, row: 1, w: 1, h: 1 }],
        [],
        null,
    );
    assert.equal(checkPlacement(occupied, 1, 1, 1, 1), false);
    assert.equal(checkPlacement(occupied, 0, 0, 1, 1), true);
});

test("occupied placement registration blocks any overlapping target region", () => {
    const occupied = registerOccupiedPlacement(new Set(), {
        col: 1,
        row: 1,
        w: 2,
        h: 2,
    });

    assert.equal(checkPlacement(occupied, 0, 0, 3, 3), false);
    assert.equal(checkPlacement(occupied, 0, 0, 1, 1), true);
});
