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
    namespace: "english",
    language: "en",
    metadata: { labels: { en: "English" } },
    layers: [
        { id: "letters", metadata: { labels: { en: "Letters" } } },
        {
            id: "words",
            metadata: { labels: { en: "Words" } },
            relationships: [
                {
                    id: "letters",
                    metadata: { labels: { en: "Letters" } },
                    targetLayer: "letters",
                    minimum: 1,
                    ordered: true,
                    resolverRole: "grapheme",
                    onDelete: "restrict",
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
                        metadata: { labels: { en: "Words" } },
                        relationships: [
                            {
                                id: "missing",
                                metadata: { labels: { en: "Missing" } },
                                targetLayer: "unknown",
                                onDelete: "restrict",
                            },
                        ],
                    },
                ],
            }),
        /relationship_target_not_found/,
    );
});

test("definition layers declare module-owned localization fields", () => {
    const definitionLayer = {
        id: "definitions",
        semanticRole: "definition" as const,
        metadata: { labels: { en: "Definitions" } },
        fields: [
            {
                id: "string_key",
                type: "string" as const,
                metadata: { labels: { en: "String key" } },
            },
            {
                id: "translations",
                type: "localizedText" as const,
                metadata: { labels: { en: "Translations" } },
            },
        ],
        definitionLocalization: {
            stringKeyPrefix: "japanese:definitions",
            stringKeyField: "string_key",
            translationsField: "translations",
        },
    };
    assert.doesNotThrow(() =>
        validateLibrarySchema({ ...english, layers: [definitionLayer] }),
    );
    assert.throws(
        () =>
            validateLibrarySchema({
                ...english,
                layers: [
                    { ...definitionLayer, definitionLocalization: undefined },
                ],
            }),
        /definition_localization_required/,
    );
});

test("schema languages canonicalize standard and private-use tags", () => {
    assert.equal(
        validateLibrarySchema({ ...english, language: "EN-us" }).language,
        "en-US",
    );
    assert.equal(
        validateLibrarySchema({ ...english, language: "X-Test" }).language,
        "x-test",
    );
    assert.throws(
        () => validateLibrarySchema({ ...english, language: "not_a_tag" }),
        /invalid_language/,
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

test("relationship deletion behavior must use a supported policy", () => {
    assert.throws(
        () =>
            validateLibrarySchema({
                ...english,
                layers: [
                    english.layers[0],
                    {
                        ...english.layers[1],
                        relationships: [
                            {
                                ...english.layers[1].relationships![0],
                                onDelete: "restrcit",
                            },
                        ],
                    },
                ],
            } as never),
        /invalid_deletion_behavior/,
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
        namespace: "korean",
        language: "ko",
        metadata: { labels: { ko: "한국어" } },
        layers: [
            { id: "jamo", metadata: { labels: { ko: "자모" } } },
            {
                id: "syllables",
                metadata: { labels: { ko: "음절" } },
                relationships: [
                    {
                        id: "composed-of",
                        metadata: { labels: { ko: "구성" } },
                        targetLayer: "jamo",
                        minimum: 2,
                        maximum: 3,
                        ordered: true,
                        resolverRole: "explicit",
                        onDelete: "restrict",
                    },
                ],
            },
        ],
    };
    assert.equal(validateLibrarySchema(korean).layers[1].id, "syllables");
});

test("schema roles and rendering hints remain independent of layer IDs", () => {
    const schema: LibrarySchema = {
        ...english,
        layers: [
            {
                id: "prompts",
                metadata: { labels: { en: "Prompts", de: "Übungen" } },
                semanticRole: "practicePrompt",
                activityCompatibility: ["practice:writtenRecall"],
                interestVeins: ["topic:travel"],
                fields: [
                    {
                        id: "instruction",
                        metadata: { labels: { en: "Instruction" } },
                        type: "localizedText",
                        required: true,
                        detail: { renderer: "text", order: 1 },
                    },
                ],
                detail: {
                    titleField: "instruction",
                    fieldOrder: ["instruction"],
                },
            },
        ],
    };

    assert.equal(
        validateLibrarySchema(schema).layers[0].semanticRole,
        "practicePrompt",
    );
});
