import test from "node:test";
import assert from "node:assert/strict";
import { createPlacementResolver } from "../../reuse/page-composer/placement-resolver.js";
import { resolveElementGridSize } from "../../reuse/page-composer/grid-sizing.js";
import {
    buildOccupiedSet,
    checkPlacement,
} from "../../reuse/page-composer/grid-math.js";

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
        const container = { getBoundingClientRect: () => ({ width: 1000 }) };
        const state = {
            layout,
            elements,
            gridCols: 10,
            contentGrid: container,
            container,
        };
        const resolver = createPlacementResolver({
            state,
            getGridSize: resolveElementGridSize,
        });
        const resolved = nested
            ? resolver.computeSubViewPlacements(state)
            : resolver.computeViewPlacements();
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
