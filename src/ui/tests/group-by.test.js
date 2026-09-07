import test from "node:test";
import assert from "node:assert/strict";
import { groupByToMap } from "../reuse/group-by.js";

test("groupByToMap groups values in insertion order", () => {
    const groups = groupByToMap(["a", "bb", "c"], (value) => value.length);
    assert.deepEqual(
        [...groups],
        [
            [1, ["a", "c"]],
            [2, ["bb"]],
        ],
    );
});
