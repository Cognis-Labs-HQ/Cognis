import assert from "node:assert/strict";
import test from "node:test";
import { uniqueRelatedEntries } from "../ui/app/related-entries.js";

test("related entries collapse duplicate labels and preserve priority", () => {
    const vocabulary = { id: "word-river", label: "river" };
    const writingUnit = { id: "symbol-river", label: " river " };
    const other = { id: "symbol-hi", label: "day" };

    assert.deepEqual(uniqueRelatedEntries([vocabulary, writingUnit, other]), [
        vocabulary,
        other,
    ]);
});
