import assert from "node:assert/strict";
import test from "node:test";
import { allowedReferenceLayers, validateReferenceLayers } from "../layers.js";

test("alphabet entries cannot reference another layer", () => {
    assert.deepEqual(allowedReferenceLayers("alphabet"), []);
    assert.throws(
        () =>
            validateReferenceLayers(
                "alphabet",
                [{ entryId: "another-character" }],
                new Map([["another-character", "alphabet"]]),
            ),
        /invalid_reference:alphabet:alphabet/,
    );
});

test("higher layers accept only their documented building blocks", () => {
    validateReferenceLayers(
        "sentences",
        [{ entryId: "word" }, { entryId: "meaning" }],
        new Map([
            ["word", "words"],
            ["meaning", "definitions"],
        ]),
    );
    assert.throws(
        () =>
            validateReferenceLayers(
                "sentences",
                [{ entryId: "character" }],
                new Map([["character", "alphabet"]]),
            ),
        /invalid_reference:sentences:alphabet/,
    );
});
