import test from "node:test";
import assert from "node:assert/strict";
import { resolveSegments } from "../ui/app/reuse/segments.js";

test("complete segmentation backtracks from a longer dead end and preserves repeats", () => {
    const candidates = [{ label: "abc" }, { label: "ab" }, { label: "cd" }];
    assert.deepEqual(resolveSegments("abcdab", candidates), [
        candidates[1],
        candidates[2],
        candidates[1],
    ]);
    assert.deepEqual(resolveSegments("abcdx", candidates), []);
});

test("pronunciation segmentation accepts normalized labels without changing identities", () => {
    const kana = [
        { id: "ne", label: "ﾈ" },
        { id: "n", label: "ﾝ" },
    ];
    assert.deepEqual(
        resolveSegments("ネン", kana, ({ label }) => label.normalize("NFKC")),
        kana,
    );
    assert.deepEqual(resolveSegments("", kana), []);
});
