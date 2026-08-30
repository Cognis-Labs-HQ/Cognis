import assert from "node:assert/strict";
import test from "node:test";
import {
    allowedReferenceLayers,
    cloneLibraryTemplate,
    inferReferenceLinks,
    validateReferenceLayers,
} from "../layers.js";

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

test("consumers clone only their requested language layers and links", () => {
    const template = cloneLibraryTemplate([
        "alphabet",
        "alt_characters",
        "definitions",
        "words",
        "sentences",
    ]);

    assert.deepEqual(
        template.layers.map(({ id }) => id),
        ["alphabet", "alt_characters", "definitions", "words", "sentences"],
    );
    assert.deepEqual(allowedReferenceLayers("sentences", template), [
        "words",
        "definitions",
    ]);
    assert.throws(
        () => cloneLibraryTemplate(["alphabet", "alphabet"]),
        /duplicate_layer/,
    );
});

test("link inference understands characters in words and words in sentences", () => {
    const candidates = new Map([
        ["alphabet", [{ id: "letter-a", label: "a" }]],
        ["words", [{ id: "word-cat", label: "cat" }]],
    ] as const);

    assert.deepEqual(inferReferenceLinks("words", "cat", candidates), [
        { entryId: "letter-a", relation: "contains" },
    ]);
    assert.deepEqual(
        inferReferenceLinks("sentences", "a cat naps", candidates),
        [{ entryId: "word-cat", relation: "contains" }],
    );
});

test("required links are enforced by a cloned template", () => {
    const template = cloneLibraryTemplate(["words", "sentences"]);
    assert.throws(
        () => validateReferenceLayers("sentences", [], new Map(), template),
        /reference_required:sentences:words/,
    );
});
