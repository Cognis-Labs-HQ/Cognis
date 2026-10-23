import assert from "node:assert/strict";
import test from "node:test";
import { canCreateLayerEntries } from "../ui/app/editability.js";

test("dependency creation follows the canonical layer creation policy", () => {
    for (const semanticRole of [
        "atomicWritingUnit",
        "particle",
        "definition",
        "meaning",
    ]) {
        assert.equal(canCreateLayerEntries({ semanticRole }), false);
    }
    assert.equal(canCreateLayerEntries({ semanticRole: "lexicalUnit" }), true);
    assert.equal(
        canCreateLayerEntries({ semanticRole: "compoundWritingUnit" }),
        true,
    );
});
