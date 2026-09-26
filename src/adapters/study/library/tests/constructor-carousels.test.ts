import assert from "node:assert/strict";
import test from "node:test";
import { validateLibrarySchema, validateReferences } from "../layers.js";
import type { LibraryEntry, LibrarySchema } from "../types.js";

const characterLayer = {
    id: "characters",
    metadata: { labels: { en: "Characters" } },
};

const character: LibraryEntry = {
    id: "a",
    schemaId: "language",
    schemaVersion: 1,
    language: "en",
    layer: "characters",
    label: "a",
    scope: "global",
    scopeId: "global",
    createdBy: "owner",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
};

function schemaFor(
    cardConstructor: LibrarySchema["layers"][number]["cardConstructor"],
): LibrarySchema {
    return {
        id: "language",
        version: 1,
        namespace: "language",
        language: "en",
        metadata: { labels: { en: "Language" } },
        layers: [
            characterLayer,
            {
                id: "alternates",
                metadata: { labels: { en: "Alternate characters" } },
                semanticRole: "compoundWritingUnit",
                fields: [
                    {
                        id: "pronunciation",
                        metadata: { labels: { en: "Pronunciation" } },
                        type: "stringList",
                        required: true,
                    },
                    {
                        id: "audio",
                        metadata: { labels: { en: "Audio" } },
                        type: "audio",
                    },
                ],
                relationships: [
                    {
                        id: "primary",
                        metadata: { labels: { en: "Primary" } },
                        targetLayer: "characters",
                        minimum: 1,
                        onDelete: "restrict",
                        presentationRole: "alternateSpelling",
                    },
                    {
                        id: "readings",
                        metadata: { labels: { en: "Readings" } },
                        targetLayer: "characters",
                        minimum: 1,
                        onDelete: "restrict",
                        presentationRole: "pronunciation",
                    },
                ],
                cardConstructor,
            },
        ],
    };
}

const constructor = {
    label: { labels: { en: "Alternate character" } },
    relationships: ["primary", "readings"],
    input_carousels: [],
    pronunciation_carousels: ["characters"],
} as const;

test("card constructors assign input and pronunciation carousels explicitly", () => {
    assert.doesNotThrow(() => validateLibrarySchema(schemaFor(constructor)));
    assert.throws(
        () =>
            validateLibrarySchema(
                schemaFor({
                    label: { labels: { en: "Alternate character" } },
                    relationships: ["readings"],
                } as never),
            ),
        /constructor_carousels_required/,
    );
    assert.throws(
        () =>
            validateLibrarySchema(
                schemaFor({
                    ...constructor,
                    pronunciation_carousels: ["missing"],
                }),
            ),
        /constructor_carousel_not_found/,
    );
});

test("alternate characters require pronunciation but not primary references", () => {
    const schema = validateLibrarySchema(schemaFor(constructor));
    assert.doesNotThrow(() =>
        validateReferences(
            schema,
            "alternates",
            [{ entryId: character.id, relation: "readings" }],
            new Map([[character.id, character]]),
        ),
    );
    assert.throws(
        () => validateReferences(schema, "alternates", [], new Map()),
        /relationship_minimum:readings/,
    );
});
