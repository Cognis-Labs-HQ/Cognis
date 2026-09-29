import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { overlapArea } from "../ui/app/variant-fit.js";

const source = readFileSync(
    new URL("../ui/app/variant-fit.js", import.meta.url),
    "utf8",
);

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

test("fitted child cards keep their position while deeper branches open", () => {
    assert.match(
        source,
        /if \(slot\.dataset\.libraryFittedDirection\) continue/,
    );
    assert.match(
        source,
        /slot\.dataset\.libraryFittedDirection = best\.direction/,
    );
    assert.match(source, /delete slot\.dataset\.libraryFittedDirection/);
    assert.match(source, /slot\.getClientRects\(\)\.length > 0/);
});
