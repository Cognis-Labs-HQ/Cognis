import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("../ui/app/composer-contract.js", import.meta.url),
    "utf8",
);
const executableSource = source.replace(
    'import { layerForEntry, pronunciationValues } from "./presentation.js";',
    `const layerForEntry = (schemas, entry) => schemas.flatMap(({ layers }) => layers).find(({ id }) => id === entry.layer);
const pronunciationValues = (entry) => {
    const value = entry.fields?.pronunciation;
    return value ? (Array.isArray(value) ? value : [value]) : [];
};`,
);
const {
    applyDerivedPronunciation,
    derivedPronunciation,
    resolveCompositionPrefix,
} = await import(
    `data:text/javascript;base64,${Buffer.from(executableSource).toString("base64")}`
);

test("vocabulary input falls back to an atomic character relationship", () => {
    assert.match(source, /target\?\.semanticRole !== "atomicWritingUnit"/);
    assert.match(source, /inputCarouselIds\.add\(characterRelationship\.id\)/);
});

test("sentence pronunciation follows the current ordered input", () => {
    const schema = {
        id: "mock-language",
        layers: [
            { id: "words", semanticRole: "lexicalUnit" },
            {
                id: "sentences",
                semanticRole: "orderedLexicalSequence",
                fields: [
                    {
                        id: "pronunciation",
                        type: "stringList",
                        multi_value: true,
                    },
                ],
            },
        ],
    };
    const entries = [
        {
            id: "word:first",
            schemaId: schema.id,
            layer: "words",
            label: "first",
            fields: { pronunciation: ["alpha"] },
        },
        {
            id: "word:second",
            schemaId: schema.id,
            layer: "words",
            label: "second",
            fields: { pronunciation: ["beta"] },
        },
    ];
    const fields = { pronunciation: ["stale"] };
    const references = [
        { entryId: "word:second", position: 0 },
        { entryId: "word:first", position: 1 },
    ];
    const layer = schema.layers[1];

    assert.equal(
        derivedPronunciation(
            { schemaId: schema.id, layer: layer.id, references, fields: {} },
            entries,
            schema,
        ),
        "betaalpha",
    );
    applyDerivedPronunciation(fields, references, entries, schema, layer, true);
    assert.deepEqual(fields.pronunciation, ["betaalpha"]);
});

test("compound input resolves the longest available cards in sequence", () => {
    const candidates = [
        { id: "a", label: "ka" },
        { id: "b", label: "kana" },
        { id: "c", label: "ji" },
    ];

    assert.deepEqual(resolveCompositionPrefix("kanaji", candidates), {
        matches: [candidates[1], candidates[2]],
        remainder: "",
    });
    assert.deepEqual(resolveCompositionPrefix("kanax", candidates), {
        matches: [candidates[1]],
        remainder: "x",
    });
});
