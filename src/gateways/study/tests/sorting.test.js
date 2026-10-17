import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = vm.createContext({});
vm.runInContext(
    readFileSync(new URL("../ui/reuse/favourites.js", import.meta.url), "utf8")
        .replace(/^import.*;$/gm, "")
        .replaceAll("export function", "function")
        .replaceAll("export async function", "async function"),
    ctx,
);
test("Study sorts are stable, handle absent timestamps, and preserve provider order by default", () => {
    const items = [
        { id: "b", label: "Beta", createdAt: "2026-10-10" },
        { id: "a", label: "Alpha", createdAt: "2026-10-11" },
        { id: "c", label: "Gamma" },
    ];
    const ids = (order) =>
        Array.from(ctx.sortItems(items, order), (item) => item.id);
    assert.deepEqual(ids("default"), ["b", "a", "c"]);
    assert.deepEqual(ids("az"), ["a", "b", "c"]);
    assert.deepEqual(ids("za"), ["c", "b", "a"]);
    assert.deepEqual(ids("newest"), ["a", "b", "c"]);
    assert.deepEqual(ids("oldest"), ["c", "b", "a"]);
    assert.deepEqual(
        items.map((item) => item.id),
        ["b", "a", "c"],
    );
});
