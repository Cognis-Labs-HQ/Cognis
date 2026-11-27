import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
    findGridSwap,
    applyGridSwap,
} from "../../reuse/page-composer/swap-model.js";

const cases = JSON.parse(
    await readFile(new URL("./fixtures/swaps.json", import.meta.url), "utf8"),
);
function stateFor(fixture) {
    return {
        gridCols: fixture.columns,
        layout: {
            placements: structuredClone(fixture.placements),
            hidden: [...fixture.hidden],
        },
    };
}
for (const fixture of cases) {
    test(fixture.name, () => {
        const state = stateFor(fixture);
        const before = structuredClone(state.layout);
        const candidate = findGridSwap(state, ...fixture.drop, "source");
        assert.equal(candidate?.id ?? null, fixture.valid ? "target" : null);
        assert.deepEqual(
            state.layout,
            before,
            "Previewing never mutates placements",
        );
        assert.equal(applyGridSwap(state, "source", "target"), fixture.valid);
        if (!fixture.valid) {
            assert.deepEqual(
                state.layout,
                before,
                "A rejected swap changes neither tile",
            );
            return;
        }
        const source = state.layout.placements.find(
            (entry) => entry.id === "source",
        );
        const target = state.layout.placements.find(
            (entry) => entry.id === "target",
        );
        assert.deepEqual(source, {
            ...before.placements[0],
            col: before.placements[1].col,
            row: before.placements[1].row,
        });
        assert.deepEqual(target, {
            ...before.placements[1],
            col: before.placements[0].col,
            row: before.placements[0].row,
        });
    });
}

test("commit rejects a destination occupied after its preview", () => {
    const fixture = cases.find(
        (entry) => entry.name === "different-sized tiles swap into clear space",
    );
    const state = stateFor(fixture);
    const target = findGridSwap(state, ...fixture.drop, "source");
    assert.ok(target);
    state.layout.placements.push({ id: "blocker", col: 8, row: 0, w: 2, h: 2 });
    const before = structuredClone(state.layout);
    assert.equal(applyGridSwap(state, "source", target.id), false);
    assert.deepEqual(state.layout, before);
});

for (const change of ["hidden", "removed"]) {
    test(`commit rejects a target ${change} after preview`, () => {
        const fixture = cases.find(
            (entry) =>
                entry.name === "different-sized tiles swap into clear space",
        );
        const state = stateFor(fixture);
        const target = findGridSwap(state, ...fixture.drop, "source");
        assert.ok(target);
        if (change === "hidden") state.layout.hidden.push(target.id);
        else
            state.layout.placements = state.layout.placements.filter(
                (entry) => entry.id !== target.id,
            );
        const before = structuredClone(state.layout);
        assert.equal(applyGridSwap(state, "source", target.id), false);
        assert.deepEqual(state.layout, before);
    });
}

test("commit uses the grid bounds current at release", () => {
    const fixture = cases.find(
        (entry) => entry.name === "different-sized tiles swap into clear space",
    );
    const state = stateFor(fixture);
    const target = findGridSwap(state, ...fixture.drop, "source");
    assert.ok(target);
    state.gridCols = 8;
    const before = structuredClone(state);
    assert.equal(applyGridSwap(state, "source", target.id), false);
    assert.deepEqual(state, before);
});
