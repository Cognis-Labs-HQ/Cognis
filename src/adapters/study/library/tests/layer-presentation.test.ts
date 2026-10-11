import assert from "node:assert/strict";
import test from "node:test";
import {
    resolveRelationships,
    validateFields,
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

test("layers can request a validated grid row and item layout", () => {
    const schema: LibrarySchema = {
        ...english,
        layers: [
            {
                ...english.layers[0],
                grid: {
                    rowSize: 5,
                    items: [
                        "english:letter:a",
                        { blank: true },
                        3,
                        null,
                        "english:letter:i",
                    ],
                },
            },
        ],
    };

    assert.deepEqual(validateLibrarySchema(schema).layers[0].grid, {
        rowSize: 5,
        items: [
            "english:letter:a",
            { blank: true },
            3,
            null,
            "english:letter:i",
        ],
    });
    assert.throws(
        () =>
            validateLibrarySchema({
                ...schema,
                layers: [
                    {
                        ...schema.layers[0],
                        grid: { rowSize: 0, items: [] },
                    },
                ],
            }),
        /invalid_layer_grid/,
    );
    assert.throws(
        () =>
            validateLibrarySchema({
                ...schema,
                layers: [
                    {
                        ...schema.layers[0],
                        grid: {
                            rowSize: 5,
                            items: ["english:letter:a", "english:letter:a"],
                        },
                    },
                ],
            }),
        /invalid_layer_grid_items/,
    );
});
test("layers can request minimal entry cards", () => {
    const schema: LibrarySchema = {
        ...english,
        layers: [{ ...english.layers[0], minimal: true }],
    };

    assert.equal(validateLibrarySchema(schema).layers[0].minimal, true);
    assert.throws(
        () =>
            validateLibrarySchema({
                ...schema,
                layers: [
                    {
                        ...schema.layers[0],
                        minimal: "yes" as unknown as boolean,
                    },
                ],
            }),
        /invalid_minimal_layer/,
    );
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

test("sentences can include ordered word and particle references", () => {
    const schema: LibrarySchema = {
        ...english,
        layers: [
            ...english.layers,
            {
                id: "particles",
                semanticRole: "particle",
                metadata: { labels: { en: "Particles" } },
            },
            {
                id: "sentences",
                semanticRole: "orderedLexicalSequence",
                metadata: { labels: { en: "Sentences" } },
                relationships: [
                    {
                        id: "words",
                        targetLayer: "words",
                        metadata: { labels: { en: "Words" } },
                        ordered: true,
                        onDelete: "restrict",
                    },
                    {
                        id: "particles",
                        targetLayer: "particles",
                        metadata: { labels: { en: "Particles" } },
                        ordered: true,
                        onDelete: "restrict",
                    },
                ],
            },
        ],
    };
    const targets = new Map([
        ["word", entry("word", "learn", "words")],
        ["particle", entry("particle", "h", "particles")],
    ]);
    assert.doesNotThrow(() =>
        validateReferences(
            validateLibrarySchema(schema),
            "sentences",
            [
                { entryId: "word", relation: "words", position: 0 },
                {
                    entryId: "particle",
                    relation: "particles",
                    position: 1,
                },
            ],
            targets,
        ),
    );
});

test("writing-unit layers require pronunciation and audio fields", () => {
    const writingLayer = {
        id: "characters",
        semanticRole: "atomicWritingUnit" as const,
        metadata: { labels: { en: "Characters" } },
        fields: [
            {
                id: "pronunciation",
                type: "stringList" as const,
                required: true,
                metadata: { labels: { en: "Pronunciation" } },
            },
            {
                id: "audio",
                type: "audio" as const,
                required: true,
                metadata: { labels: { en: "Audio" } },
            },
        ],
    };
    assert.doesNotThrow(() =>
        validateLibrarySchema({ ...english, layers: [writingLayer] }),
    );
    assert.doesNotThrow(() =>
        validateLibrarySchema({
            ...english,
            layers: [
                {
                    ...writingLayer,
                    fields: writingLayer.fields.map((field) =>
                        field.id === "audio"
                            ? { ...field, required: false }
                            : field,
                    ),
                },
            ],
        }),
    );
    assert.throws(
        () =>
            validateLibrarySchema({
                ...english,
                layers: [
                    { ...writingLayer, fields: writingLayer.fields.slice(1) },
                ],
            }),
        /pronunciation_field_required/,
    );
    assert.throws(
        () =>
            validateLibrarySchema({
                ...english,
                layers: [
                    {
                        ...writingLayer,
                        fields: writingLayer.fields.slice(0, 1),
                    },
                ],
            }),
        /audio_field_required/,
    );
});

test("stroke patterns require ordered normalized pen samples", () => {
    const schema = validateLibrarySchema({
        ...english,
        layers: [
            {
                id: "characters",
                metadata: { labels: { en: "Characters" } },
                fields: [
                    {
                        id: "strokes",
                        type: "strokePattern",
                        metadata: { labels: { en: "Strokes" } },
                    },
                ],
            },
        ],
    });
    assert.doesNotThrow(() =>
        validateFields(schema, "characters", {
            strokes: {
                coordinateSystem: "normalized",
                tolerance: 60,
                strokes: [
                    {
                        points: [
                            { x: 0.1, y: 0.2, time: 0, pressure: 0.4 },
                            { x: 0.8, y: 0.7, time: 120, pressure: 0.7 },
                        ],
                    },
                ],
            },
        }),
    );
    assert.throws(
        () =>
            validateFields(schema, "characters", {
                strokes: {
                    coordinateSystem: "normalized",
                    strokes: [
                        {
                            points: [
                                { x: 0.1, y: 0.2, time: 5 },
                                { x: 1.2, y: 0.7, time: 4 },
                            ],
                        },
                    ],
                },
            }),
        /invalid_field_type:strokes/,
    );
});

test("lexical and composite layers derive rather than own stroke patterns", () => {
    for (const semanticRole of [
        "lexicalUnit",
        "orderedLexicalSequence",
    ] as const) {
        assert.throws(
            () =>
                validateLibrarySchema({
                    ...english,
                    layers: [
                        {
                            id: "derived",
                            semanticRole,
                            metadata: { labels: { en: "Derived" } },
                            fields: [
                                {
                                    id: "strokes",
                                    type: "strokePattern",
                                    metadata: { labels: { en: "Strokes" } },
                                },
                            ],
                        },
                    ],
                }),
            /stroke_pattern_writing_unit_required/,
        );
    }
});

test("layers accept only boolean dictionary lookup opt-outs", () => {
    assert.doesNotThrow(() =>
        validateLibrarySchema({
            ...english,
            layers: english.layers.map((layer) => ({
                ...layer,
                dictionary_lookup: false,
            })),
        }),
    );
    assert.throws(
        () =>
            validateLibrarySchema({
                ...english,
                layers: english.layers.map((layer, index) => ({
                    ...layer,
                    ...(index === 0
                        ? { dictionary_lookup: "false" as never }
                        : {}),
                })),
            }),
        /invalid_dictionary_lookup/,
    );
});
