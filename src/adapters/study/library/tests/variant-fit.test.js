import assert from "node:assert/strict";
import test from "node:test";
import { overlapArea } from "../ui/app/variant-fit.js";

test("overlap area detects cards assigned to the same slot", () => {
    assert.equal(
        overlapArea(
            { top: 0, right: 100, bottom: 80, left: 0 },
            { top: 0, right: 100, bottom: 80, left: 0 },
        ),
        8000,
    );
});

test("edge-adjacent card slots do not count as collisions", () => {
    assert.equal(
        overlapArea(
            { top: 0, right: 100, bottom: 80, left: 0 },
            { top: 80, right: 100, bottom: 160, left: 0 },
        ),
        0,
    );
});
