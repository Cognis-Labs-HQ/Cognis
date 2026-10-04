import assert from "node:assert/strict";
import test from "node:test";
import {
    distinctPronunciationLabels,
    excludeTitleReferenceDuplicates,
    resolveLabelComposition,
    resolveReferenceAliasComposition,
} from "../ui/app/composition-links.js";

const schemas = [
    {
        id: "mock-language",
        layers: [
            { id: "characters", semanticRole: "atomicWritingUnit" },
            { id: "alt-characters", semanticRole: "compoundWritingUnit" },
            { id: "words", semanticRole: "lexicalUnit" },
            { id: "sentences", semanticRole: "orderedLexicalSequence" },
        ],
    },
];
const word = {
    id: "word-example",
    schemaId: "mock-language",
    layer: "words",
    language: "x-mock",
};
const entries = [
    word,
    {
        id: "symbol-example",
        schemaId: "mock-language",
        layer: "alt-characters",
        language: "x-mock",
        label: "like",
    },
    {
        id: "character-s",
        schemaId: "mock-language",
        layer: "characters",
        language: "x-mock",
        label: "s",
    },
    {
        id: "character-k",
        schemaId: "mock-language",
        layer: "characters",
        language: "x-mock",
        label: "k",
    },
];

test("word spellings resolve every writing-unit component", () => {
    assert.deepEqual(
        resolveLabelComposition("likek", word, schemas, entries).map(
            ({ id }) => id,
        ),
        ["symbol-example", "character-k"],
    );
    assert.deepEqual(
        resolveLabelComposition("sk", word, schemas, entries).map(
            ({ id }) => id,
        ),
        ["character-s", "character-k"],
    );
});

test("homographic words resolve to writing units instead of each other", () => {
    const flower = { ...word, id: "word-flower", label: "hn" };
    const nose = { ...word, id: "word-nose", label: "hn" };
    const homographEntries = [
        flower,
        nose,
        { ...entries[2], id: "character-ha", label: "h" },
        { ...entries[3], id: "character-na", label: "n" },
    ];

    assert.deepEqual(
        resolveLabelComposition(
            flower.label,
            flower,
            schemas,
            homographEntries,
        ).map(({ id }) => id),
        ["character-ha", "character-na"],
    );
});

test("sentence spellings continue to resolve vocabulary entries", () => {
    const sentence = {
        ...word,
        id: "sentence-homograph",
        layer: "sentences",
        label: "hn",
    };
    const flower = { ...word, id: "word-flower", label: "hn" };

    assert.deepEqual(
        resolveLabelComposition(sentence.label, sentence, schemas, [
            sentence,
            flower,
        ]).map(({ id }) => id),
        ["word-flower"],
    );
});

test("partially resolvable spellings do not produce misleading links", () => {
    assert.deepEqual(
        resolveLabelComposition("unmatched", word, schemas, entries),
        [],
    );
});

test("ordered relationship targets resolve pronunciation aliases", () => {
    const mountain = {
        id: "word-peak",
        label: "peak",
        fields: { pronunciation: ["mount"] },
    };
    const from = { id: "particle-from", label: "from" };
    const river = {
        id: "word-stream",
        label: "river",
        fields: { pronunciation: "stream" },
    };
    const until = { id: "particle-until", label: "until" };

    assert.deepEqual(
        resolveReferenceAliasComposition("mountfromstreamuntil", [
            mountain,
            from,
            river,
            until,
        ]).map(({ id }) => id),
        ["word-peak", "particle-from", "word-stream", "particle-until"],
    );
    assert.deepEqual(
        resolveReferenceAliasComposition("mountfromoceanuntil", [
            mountain,
            from,
            river,
            until,
        ]),
        [],
    );
});

test("title pronunciations do not duplicate primary or secondary spellings", () => {
    assert.deepEqual(
        distinctPronunciationLabels({
            label: "person",
            fields: { pronunciation: ["person"] },
        }),
        [],
    );
    assert.deepEqual(
        distinctPronunciationLabels(
            {
                label: "person-symbol",
                fields: { pronunciation: ["person", "human", "individual"] },
            },
            ["individual"],
        ),
        ["person", "human"],
    );
});

test("title detail omits links already composing the primary title", () => {
    const character = { id: "character-k", label: "k" };
    const otherCharacter = { id: "character-g", label: "g" };

    assert.deepEqual(
        excludeTitleReferenceDuplicates(
            [[character], [otherCharacter]],
            [{ id: "character-k", label: " k " }],
        ),
        [[otherCharacter]],
    );
    assert.deepEqual(
        excludeTitleReferenceDuplicates(
            [[character]],
            [{ id: "different-target", label: "k" }],
        ),
        [[character]],
    );
});
