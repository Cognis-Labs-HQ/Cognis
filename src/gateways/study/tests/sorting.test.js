import assert from "node:assert/strict";
import test from "node:test";
import { sortItems } from "../../../ui/reuse/collection-view.js";

test("Study sorts are stable, handle absent timestamps, and preserve provider order by default", () => {
    const items = [
        { id: "b", label: "Beta", createdAt: "2026-10-10" },
        { id: "a", label: "Alpha", createdAt: "2026-10-11" },
        { id: "c", label: "Gamma" },
    ];
    const ids = (order) =>
        Array.from(sortItems(items, order), (item) => item.id);
    assert.deepEqual(ids("default"), ["b", "a", "c"]);
    assert.deepEqual(ids("az"), ["a", "b", "c"]);
    assert.deepEqual(ids("za"), ["c", "b", "a"]);
    assert.deepEqual(ids("newest"), ["a", "b", "c"]);
    assert.deepEqual(ids("oldest"), ["b", "a", "c"]);
    assert.deepEqual(
        items.map((item) => item.id),
        ["b", "a", "c"],
    );
});

test("timestamp ties use the Library sequence in opposite chronological directions", () => {
    const items = [10, 2, 7].map((displayId) => ({
        id: `item-${displayId}`,
        displayId,
        createdAt: "2026-10-19",
    }));
    assert.deepEqual(
        sortItems(items, "newest").map((item) => item.displayId),
        [10, 7, 2],
    );
    assert.deepEqual(
        sortItems(items, "oldest").map((item) => item.displayId),
        [2, 7, 10],
    );
    assert.deepEqual(
        items.map((item) => item.displayId),
        [10, 2, 7],
    );
});
