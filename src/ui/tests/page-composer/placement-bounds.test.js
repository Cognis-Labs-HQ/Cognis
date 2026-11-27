import test from "node:test";
import assert from "node:assert/strict";
import { createPlacementResolver } from "../../reuse/page-composer/placement-resolver.js";
import { resolveElementGridSize } from "../../reuse/page-composer/grid-sizing.js";
import {
    buildOccupiedSet,
    checkPlacement,
} from "../../reuse/page-composer/grid-math.js";

function resolvePlacements({ layout, elements, columns, width, nested }) {
    const container = { getBoundingClientRect: () => ({ width }) };
    const state = {
        layout,
        elements,
        gridCols: columns,
        contentGrid: container,
        container,
    };
    const resolver = createPlacementResolver({
        state,
        getGridSize: resolveElementGridSize,
    });
    return nested
        ? resolver.computeSubViewPlacements(state)
        : resolver.computeViewPlacements();
}

for (const nested of [false, true]) {
    test(`${nested ? "nested" : "main"} repacking honors current size bounds when a saved row cannot expand in place`, () => {
        const layout = {
            placements: [
                { id: "title", col: 0, row: 0, w: 2, h: 2 },
                { id: "details", col: 2, row: 0, w: 4, h: 3 },
                { id: "next", col: 6, row: 0, w: 4, h: 2 },
                { id: "lower", col: 6, row: 2, w: 4, h: 3 },
            ],
            hidden: [],
        };
        const original = structuredClone(layout);
        const elements = [
            { id: "title", gridSize: { min: [4, 2] } },
            { id: "details", gridSize: { min: [3, 2], max: [3, 4] } },
            { id: "next", gridSize: { min: [3, 2] } },
            { id: "lower", gridSize: { min: [3, 2] } },
        ];
        const resolved = resolvePlacements({
            layout,
            elements,
            columns: 10,
            width: 1000,
            nested,
        });
        assert.ok(
            resolved.find((entry) => entry.id === "title").w >= 4,
            "Raised minimum is applied",
        );
        assert.equal(
            resolved.find((entry) => entry.id === "details").w,
            3,
            "Lowered maximum is applied",
        );
        for (const placement of resolved) {
            const occupied = buildOccupiedSet(resolved, [], placement.id);
            assert.ok(
                checkPlacement(
                    occupied,
                    placement.col,
                    placement.row,
                    placement.w,
                    placement.h,
                ),
                "Reflow avoids overlaps",
            );
            assert.ok(
                placement.col + placement.w <= 10,
                "Reflow stays in the grid",
            );
        }
        assert.deepEqual(
            layout,
            original,
            "Viewing does not overwrite saved preferences",
        );
    });
}

for (const nested of [false, true]) {
    for (const [label, sizing, width] of [
        ["minimum", { min: [3, 2] }, 3],
        ["full", { min: [2, 2], max: "full" }, 8],
        ["half", { min: [2, 2], max: "half" }, 4],
        ["fill", { min: [2, 2], max: "fill" }, 8],
    ]) {
        test(`${nested ? "nested" : "main"} normalization keeps a right-edge ${label} card within its grid`, () => {
            const layout = {
                placements: [{ id: "panel", col: 6, row: 0, w: 2, h: 2 }],
                hidden: [],
            };
            const original = structuredClone(layout);
            const placements = resolvePlacements({
                layout,
                elements: [{ id: "panel", gridSize: sizing }],
                columns: 8,
                width: 780,
                nested,
            });
            assert.deepEqual(
                placements,
                [{ id: "panel", col: 0, row: 0, w: width, h: 2 }],
                "A widened card is repacked without an implicit grid column",
            );
            assert.deepEqual(
                layout,
                original,
                "Viewing retains the stored layout",
            );
        });
    }
}
