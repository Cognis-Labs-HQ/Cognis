import test from "node:test";
import assert from "node:assert/strict";
import { snapDragPlacement } from "../../reuse/page-composer/drag-placement.js";
import {
    RESIZE_EDGES,
    resizeLimitAxes,
    resizePlacement,
} from "../../reuse/page-composer/resize-model.js";
import { createPlacementResolver } from "../../reuse/page-composer/placement-resolver.js";
import { resolveElementGridSize } from "../../reuse/page-composer/grid-sizing.js";
import {
    buildOccupiedSet,
    checkPlacement,
} from "../../reuse/page-composer/grid-math.js";

function canPlaceAmong(placements) {
    return (column, row, width, height, id) =>
        checkPlacement(
            buildOccupiedSet(placements, [], id),
            column,
            row,
            width,
            height,
        );
}

test("drag destination closes the visible gap without changing size or other cards", () => {
    const others = [{ id: "other", col: 0, row: 0, w: 3, h: 2 }];
    const candidate = { id: "moving", col: 0, row: 8, w: 2, h: 3 };
    assert.deepEqual(snapDragPlacement(candidate, 12, canPlaceAmong(others)), {
        ...candidate,
        row: 2,
    });
    assert.equal(candidate.row, 8);
    assert.equal(others[0].row, 0);
});

test("snapping never jumps across another card to an earlier free gap", () => {
    const obstacle = { id: "other", col: 0, row: 3, w: 3, h: 2 };
    const candidate = { id: "moving", col: 0, row: 8, w: 2, h: 2 };
    assert.equal(
        snapDragPlacement(candidate, 12, canPlaceAmong([obstacle])).row,
        5,
    );
});

test("half-grid drag destinations respect every occupied rectangle", () => {
    const others = [{ id: "other", col: 0, row: 0, w: 3, h: 1.5 }];
    const candidate = { id: "moving", col: 0, row: 5, w: 2, h: 1 };
    assert.equal(
        snapDragPlacement(candidate, 5, canPlaceAmong(others)).row,
        1.5,
    );
    const blocked = { ...candidate, row: 1 };
    assert.deepEqual(
        snapDragPlacement(blocked, 5, canPlaceAmong(others)),
        blocked,
        "An occupied pointer target remains blocked for swap handling",
    );
});

for (const edge of RESIZE_EDGES) {
    for (const intent of ["minimum", "maximum"]) {
        test(`${edge.name} reports ${intent} limit crossings on its own axes`, () => {
            const direction = intent === "minimum" ? -1 : 1;
            const options = {
                placement: { id: "card", col: 4, row: 4, w: 3, h: 3 },
                gridSize: resolveElementGridSize({
                    gridSize: { default: [3, 3], min: [2, 2], max: [5, 5] },
                }),
                edge,
                columns: 16,
                rows: 12,
                delta: {
                    col: direction * edge.horizontal * 20,
                    row: direction * edge.vertical * 20,
                },
            };
            assert.deepEqual(resizeLimitAxes(options), {
                horizontal: Boolean(edge.horizontal),
                vertical: Boolean(edge.vertical),
            });
            const next = resizePlacement(options);
            assert.ok(next.w >= 2 && next.w <= 5);
            assert.ok(next.h >= 2 && next.h <= 5);
            assert.deepEqual(
                resizeLimitAxes({ ...options, delta: { col: 0, row: 0 } }),
                { horizontal: false, vertical: false },
            );
        });
    }
}

test("corner limits remain independent when only one axis exceeds a bound", () => {
    const options = {
        placement: { id: "card", col: 2, row: 2, w: 3, h: 3 },
        edge: RESIZE_EDGES.find((edge) => edge.direction === "se"),
        gridSize: resolveElementGridSize({
            gridSize: { min: [2, 2], max: [5, 5] },
        }),
        columns: 12,
        rows: 12,
    };
    assert.deepEqual(
        resizeLimitAxes({ ...options, delta: { col: -1.01, row: 0.5 } }),
        { horizontal: true, vertical: false },
    );
    assert.deepEqual(
        resizeLimitAxes({ ...options, delta: { col: 0.5, row: 2.01 } }),
        { horizontal: false, vertical: true },
    );
});

for (const nested of [false, true]) {
    test(`${nested ? "nested" : "main"} saved widths and spacing survive view resolution`, () => {
        const placements = [
            { id: "first", col: 0, row: 2, w: 2, h: 3 },
            { id: "second", col: 4, row: 2, w: 3, h: 4 },
        ];
        const state = {
            gridCols: 12,
            layout: { placements, hidden: [] },
            layoutProfiles: { layoutsByGrid: { "cols-12": { placements } } },
            elements: placements.map((placement) => ({
                id: placement.id,
                gridSize: { min: [1, 1], max: [12, 12] },
            })),
        };
        const resolver = createPlacementResolver({
            state,
            getGridSize: resolveElementGridSize,
        });
        const actual = nested
            ? resolver.computeSubViewPlacements(state)
            : resolver.computeViewPlacements();
        assert.deepEqual(actual, placements);
        state.editing = true;
        state.layoutProfiles = { layoutsByGrid: {} };
        assert.deepEqual(
            nested
                ? resolver.computeSubViewPlacements(state)
                : resolver.computeViewPlacements(),
            placements,
            "Unsaved edits also keep their dimensions during reflow",
        );
    });
}
