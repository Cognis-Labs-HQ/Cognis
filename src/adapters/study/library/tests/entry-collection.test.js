import assert from "node:assert/strict";
import test from "node:test";
import { mergeEntryCollectionUpdate } from "../ui/app/entry-collection.js";

test("single entry updates preserve the renderable entry collection", () => {
    const first = { id: "first", label: "Before" };
    const second = { id: "second", label: "Second" };
    const merged = mergeEntryCollectionUpdate([first, second], {
        id: first.id,
        label: "After",
    });

    assert.ok(Array.isArray(merged));
    assert.equal(merged.length, 2);
    assert.equal(merged[0], first);
    assert.equal(merged[0].label, "After");
    assert.equal(merged[1], second);
});

test("complete collection updates remain supported", () => {
    const replacement = [{ id: "replacement", label: "Replacement" }];
    assert.equal(mergeEntryCollectionUpdate([], replacement), replacement);
});
