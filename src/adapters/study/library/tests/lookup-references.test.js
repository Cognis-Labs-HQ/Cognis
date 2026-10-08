import assert from "node:assert/strict";
import test from "node:test";
import { resolveLookupReferences } from "../ui/app/create-entry/lookup-references.js";

const schema = { id: "ja", version: 88 };
const layer = {
    relationships: [
        { id: "reading", targetLayer: "kana" },
        { id: "spelling", targetLayer: "kanji" },
    ],
};
const entries = [
    {
        id: "db-kana",
        sourceRecordId: "pack-kana",
        schemaId: "ja",
        schemaVersion: 88,
        layer: "kana",
    },
    {
        id: "db-kanji",
        sourceRecordId: "pack-kanji",
        schemaId: "ja",
        schemaVersion: 88,
        layer: "kanji",
    },
];

test("installed record IDs replace source IDs in ordered and grouped lookup links", () => {
    const input = {
        fields: { pronunciation: ["きょう"] },
        references: [
            { relation: "spelling", entryId: "pack-kanji", position: 0 },
        ],
        referenceGroups: {
            reading: [
                [{ relation: "reading", entryId: "pack-kana", position: 0 }],
            ],
        },
    };
    const { suggestion, unresolved } = resolveLookupReferences(
        input,
        entries,
        schema,
        layer,
    );
    assert.equal(unresolved, false);
    assert.equal(suggestion.references[0].entryId, "db-kanji");
    assert.equal(suggestion.referenceGroups.reading[0][0].entryId, "db-kana");
    assert.equal(input.referenceGroups.reading[0][0].entryId, "pack-kana");
    assert.deepEqual(suggestion.fields, input.fields);
});

test("missing or ambiguous targets do not produce invalid or shifted pronunciation groups", () => {
    for (const targets of [
        entries.slice(1),
        [...entries, { ...entries[0], id: "duplicate" }],
        entries.map((entry) => ({ ...entry, schemaId: "other" })),
    ]) {
        const input = {
            fields: { pronunciation: ["きょう", "しつ"] },
            referenceGroups: {
                reading: [
                    [{ entryId: "pack-kana", relation: "reading" }],
                    [{ entryId: "missing", relation: "reading" }],
                ],
            },
        };
        const { suggestion, unresolved } = resolveLookupReferences(
            input,
            targets,
            schema,
            layer,
        );
        assert.equal(unresolved, true);
        assert.deepEqual(suggestion.referenceGroups, {});
        assert.deepEqual(suggestion.fields.pronunciation, ["きょう", "しつ"]);
    }
});

test("canonical IDs stay canonical and wrong-layer source matches are excluded", () => {
    const input = {
        references: [
            { relation: "reading", entryId: "db-kana" },
            { relation: "reading", entryId: "pack-kanji" },
        ],
    };
    const { suggestion, unresolved } = resolveLookupReferences(
        input,
        entries,
        schema,
        layer,
    );
    assert.equal(unresolved, true);
    assert.deepEqual(suggestion.references, [input.references[0]]);
});

test("resolved lookup groups pass the same validation used when creating cards", async () => {
    const { validateReferences } = await import("../layers.js");
    const cardLayer = {
        id: "card",
        relationships: [
            {
                id: "reading",
                targetLayer: "kana",
                grouped: true,
                ordered: true,
            },
            { id: "spelling", targetLayer: "kanji", ordered: true },
        ],
    };
    const cardSchema = {
        ...schema,
        layers: [cardLayer, { id: "kana" }, { id: "kanji" }],
    };
    const input = {
        references: [
            { entryId: "pack-kanji", relation: "spelling", position: 0 },
        ],
        referenceGroups: {
            reading: [
                [{ entryId: "pack-kana", relation: "reading", position: 0 }],
            ],
        },
    };
    const targets = new Map(entries.map((entry) => [entry.id, entry]));
    assert.throws(
        () =>
            validateReferences(
                cardSchema,
                "card",
                input.references,
                targets,
                input.referenceGroups,
            ),
        /reference_not_found/,
    );
    const { suggestion } = resolveLookupReferences(
        input,
        entries,
        cardSchema,
        cardLayer,
    );
    assert.doesNotThrow(() =>
        validateReferences(
            cardSchema,
            "card",
            suggestion.references,
            targets,
            suggestion.referenceGroups,
        ),
    );
});

test("structured meanings replace an aggregate source definition while retaining spelling links", () => {
    const result = resolveLookupReferences(
        {
            definitions: [{ translations: { en: "teach; faith" } }],
            references: [
                { relation: "meaning", entryId: "aggregate" },
                { relation: "spelling", entryId: "pack-kanji" },
            ],
        },
        entries,
        { ...schema, layers: [{ id: "meanings", semanticRole: "definition" }] },
        {
            relationships: [
                ...layer.relationships,
                { id: "meaning", targetLayer: "meanings" },
            ],
        },
    );
    assert.equal(result.unresolved, false);
    assert.deepEqual(result.suggestion.references, [
        { relation: "spelling", entryId: "db-kanji" },
    ]);
});

test("dictionary pronunciations resolve to canonical Kana, including compound and repeated characters", () => {
    const kana = ["きょ", "う", "し", "つ", "っく"].map((label, index) => ({
        id: `kana-${index}`,
        label,
        schemaId: "ja",
        layer: "kana",
        schemaVersion: 88,
    }));
    const readingSchema = {
        ...schema,
        layers: [{ id: "kana", semanticRole: "atomicWritingUnit" }],
    };
    const readingLayer = {
        relationships: [
            {
                id: "reading",
                targetLayer: "kana",
                grouped: true,
                ordered: true,
                presentationRole: "pronunciation",
            },
        ],
    };
    for (const referenceGroups of [
        undefined,
        { reading: [[{ entryId: "uninstalled-provider-id" }]] },
    ]) {
        const result = resolveLookupReferences(
            {
                fields: { pronunciation: ["きょうしつ", "っくっく"] },
                referenceGroups,
            },
            kana,
            readingSchema,
            readingLayer,
        );
        assert.equal(result.unresolved, false);
        assert.deepEqual(
            result.suggestion.referenceGroups.reading.map((group) =>
                group.map(({ entryId }) => entryId),
            ),
            [
                ["kana-0", "kana-1", "kana-2", "kana-3"],
                ["kana-4", "kana-4"],
            ],
        );
        assert.deepEqual(
            result.suggestion.referenceGroups.reading[1].map(
                ({ position }) => position,
            ),
            [0, 1],
        );
    }
    const missing = resolveLookupReferences(
        { fields: { pronunciation: ["きょう", "unknown"] } },
        kana,
        readingSchema,
        readingLayer,
    );
    assert.equal(missing.unresolved, true);
    assert.deepEqual(missing.suggestion.referenceGroups, {});
});
