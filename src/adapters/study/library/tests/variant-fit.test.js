import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isAncestorSafe, overlapArea } from "../ui/app/variant-fit.js";

const source = readFileSync(
    new URL("../ui/app/variant-fit.js", import.meta.url),
    "utf8",
);
const interactionSource = readFileSync(
    new URL("../ui/app/variants.js", import.meta.url),
    "utf8",
);
const stylesheet = readFileSync(
    new URL("../ui/library.css", import.meta.url),
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

test("child cards can never occupy any ancestor card bounds", () => {
    const parent = { top: 0, right: 100, bottom: 80, left: 0 };
    const grandparent = { top: 82, right: 100, bottom: 162, left: 0 };
    assert.equal(
        isAncestorSafe({ top: 20, right: 120, bottom: 100, left: 20 }, [
            parent,
            grandparent,
        ]),
        false,
    );
    assert.equal(
        isAncestorSafe({ top: 164, right: 100, bottom: 244, left: 0 }, [
            parent,
            grandparent,
        ]),
        true,
    );
    assert.match(
        source,
        /if \(!isAncestorSafe\(rect, ancestorRects\)\) continue/,
    );
    assert.match(source, /setVariantDistance\(slot, distance\)/);
    assert.doesNotMatch(source, /slot\.hidden = true/);
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

test("diagonal child navigation uses hover intent and a continuous hit area", () => {
    assert.match(interactionSource, /BRANCH_HOVER_INTENT_MS = 100/);
    assert.match(interactionSource, /pendingBranchShell\?\.contains/);
    assert.match(
        stylesheet,
        /\.library-entry-variant-down-right[\s\S]*::after/,
    );
    assert.doesNotMatch(stylesheet, /library-entry-focus-pulse/);
});
