import assert from "node:assert/strict";
import test from "node:test";
import { uniqueRelatedEntries } from "../ui/app/related-entries.js";

test("related entries collapse duplicate labels and preserve priority", () => {
    const vocabulary = { id: "word-kawa", label: "川" };
    const writingUnit = { id: "kanji-kawa", label: " 川 " };
    const other = { id: "kanji-hi", label: "日" };

    assert.deepEqual(uniqueRelatedEntries([vocabulary, writingUnit, other]), [
        vocabulary,
        other,
    ]);
});
