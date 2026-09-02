import assert from "node:assert/strict";
import test from "node:test";
import {
    resolveRelationships,
    validateLibrarySchema,
    validateReferences,
} from "../layers.js";
import type { LibraryEntry, LibrarySchema } from "../types.js";

const english: LibrarySchema = {
    id: "english",
    version: 1,
    language: "en",
    label: "English",
    layers: [
        { id: "letters", label: "Letters" },
        {
            id: "words",
            label: "Words",
            relationships: [
                {
                    id: "letters",
                    label: "Letters",
                    targetLayer: "letters",
                    minimum: 1,
                    ordered: true,
                    resolver: "grapheme",
                },
            ],
        },
    ],
};

const entry = (id: string, label: string, layer = "letters"): LibraryEntry => ({
    id,
    schemaId: "english",
    schemaVersion: 1,
    language: "en",
    layer,
    label,
    scope: "global",
    scopeId: "global",
    createdBy: "owner",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
});

test("consumers define arbitrary layers and constrained relationships", () => {
    assert.deepEqual(validateLibrarySchema(english), english);
    assert.throws(
        () =>
            validateLibrarySchema({
                ...english,
                layers: [
                    {
                        id: "words",
                        label: "Words",
                        relationships: [
                            {
                                id: "missing",
                                label: "Missing",
                                targetLayer: "unknown",
                            },
                        ],
                    },
                ],
            }),
        /relationship_target_not_found/,
    );
});

test("relationship cardinality and target layers are enforced", () => {
    const a = entry("a", "a");
    validateReferences(
        english,
        "words",
        [{ entryId: a.id, relation: "letters", position: 0 }],
        new Map([[a.id, a]]),
    );
    assert.throws(
        () => validateReferences(english, "words", [], new Map()),
        /relationship_minimum:letters/,
    );
    const word = entry("word", "word", "words");
    assert.throws(
        () =>
            validateReferences(
                english,
                "words",
                [{ entryId: word.id, relation: "letters" }],
                new Map([[word.id, word]]),
            ),
        /invalid_relationship_target/,
    );
});

test("grapheme resolution preserves repeated ordered components", () => {
    const proposals = resolveRelationships(english, "words", "letter", [
        entry("l", "l"),
        entry("e", "e"),
        entry("t", "t"),
        entry("r", "r"),
    ]);
    assert.equal(proposals[0].deterministic, true);
    assert.deepEqual(
        proposals[0].references.map(({ entryId, position }) => [
            entryId,
            position,
        ]),
        [
            ["l", 0],
            ["e", 1],
            ["t", 2],
            ["t", 3],
            ["e", 4],
            ["r", 5],
        ],
    );
});

test("Korean consumers can model Jamo and compound syllable blocks", () => {
    const korean: LibrarySchema = {
        id: "korean",
        version: 1,
        language: "ko",
        label: "한국어",
        layers: [
            { id: "jamo", label: "자모" },
            {
                id: "syllables",
                label: "음절",
                relationships: [
                    {
                        id: "composed-of",
                        label: "구성",
                        targetLayer: "jamo",
                        minimum: 2,
                        maximum: 3,
                        ordered: true,
                        resolver: "explicit",
                    },
                ],
            },
        ],
    };
    assert.equal(validateLibrarySchema(korean).layers[1].id, "syllables");
});
