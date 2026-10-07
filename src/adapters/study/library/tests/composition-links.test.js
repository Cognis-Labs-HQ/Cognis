import assert from "node:assert/strict";
import test from "node:test";
import {
    distinctPronunciationLabels,
    excludeTitleReferenceDuplicates,
    resolveLabelComposition,
    resolveReferenceAliasComposition,
    resolveGroupedPronunciation,
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

test("pronunciation links resolve by their reading despite unlinked or duplicate values", () => {
    const first = { id: "first-character", label: "a" };
    const second = { id: "second-character", label: "b" };
    const third = { id: "third-character", label: "c" };
    const groups = [[third], [first, second]];
    assert.deepEqual(resolveGroupedPronunciation("ab", groups), [
        first,
        second,
    ]);
    assert.deepEqual(resolveGroupedPronunciation("c", groups), [third]);
    assert.deepEqual(resolveGroupedPronunciation("unlinked", groups), []);
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

test("compound kana resolves upward through canonical spelling and pronunciation components", async () => {
    const { resolveCompositionDependants } =
        await import("../ui/app/composition-links.js");
    const character = { ...entries[2], id: "sokuon-ku", label: "っく" };
    const kana = ["ゆ", "っ", "く", "り"].map((label) => ({
        ...entries[2],
        id: `kana-${label}`,
        label,
    }));
    const adverb = {
        ...word,
        id: "slowly",
        label: "ゆっくり",
        references: kana.map(({ id }) => ({ entryId: id })),
    };
    const pronounced = {
        ...word,
        id: "reading",
        label: "Reading",
        fields: { pronunciation: ["ゆっくり"] },
    };
    const partial = { ...word, id: "unresolved", label: "ゆっくり?" };
    const foreign = { ...adverb, id: "foreign", language: "another-language" };
    const catalog = [...kana, character, adverb, pronounced, partial, foreign];
    assert.deepEqual(
        resolveLabelComposition(adverb.label, adverb, schemas, catalog).map(
            ({ id }) => id,
        ),
        ["kana-ゆ", "sokuon-ku", "kana-り"],
    );
    assert.deepEqual(
        resolveCompositionDependants(character, schemas, catalog).map(
            ({ id }) => id,
        ),
        ["slowly", "reading"],
    );
    assert.deepEqual(
        resolveCompositionDependants(kana[3], schemas, catalog).map(
            ({ id }) => id,
        ),
        ["slowly", "reading"],
    );
});

test("detail neighbours stop at the immediate spelling or pronunciation parent", async () => {
    const { filterImmediateDependants, resolveCompositionDependants } =
        await import("../ui/app/composition-links.js");
    const kana = ["あ", "め", "る", "く"].map((label) => ({
        ...entries[2],
        id: `kana-${label}`,
        label,
    }));
    const rainCharacter = {
        ...entries[1],
        id: "rain-character",
        label: "雨",
        fields: { pronunciation: ["あめ"] },
        referenceGroups: {
            readings: [[{ entryId: "kana-あ" }, { entryId: "kana-め" }]],
        },
    };
    const walkCharacter = {
        ...entries[1],
        id: "walk-character",
        label: "歩",
        fields: { pronunciation: ["ある"] },
        references: [{ entryId: "kana-あ" }, { entryId: "kana-る" }],
    };
    const rainWord = {
        ...word,
        id: "rain-word",
        label: "雨",
        fields: { pronunciation: ["あめ"] },
        references: [{ entryId: rainCharacter.id }],
    };
    const walkWord = {
        ...word,
        id: "walk-word",
        label: "歩く",
        fields: { pronunciation: ["あるく"] },
        references: [
            { entryId: walkCharacter.id },
            { entryId: "kana-く" },
            { entryId: "kana-あ" },
        ],
    };
    const groupedWord = {
        ...word,
        id: "grouped-word",
        label: "Group",
        fields: { pronunciation: ["あめ"] },
        referenceGroups: { spelling: [[{ entryId: rainCharacter.id }]] },
    };
    const sentence = {
        ...word,
        id: "sentence",
        layer: "sentences",
        label: "雨歩く",
        references: [{ entryId: rainWord.id }, { entryId: walkWord.id }],
    };
    const directWord = {
        ...word,
        id: "direct-word",
        label: "あ",
        references: [{ entryId: "kana-あ" }],
    };
    const catalog = [
        ...kana,
        rainCharacter,
        walkCharacter,
        rainWord,
        walkWord,
        groupedWord,
        sentence,
        directWord,
    ];
    const inferred = resolveCompositionDependants(kana[0], schemas, catalog);
    const displayed = filterImmediateDependants(
        kana[0],
        inferred,
        schemas,
        catalog,
    );
    assert.deepEqual(
        displayed.map(({ id }) => id),
        ["rain-character", "walk-character", "direct-word"],
    );
    assert.deepEqual(
        filterImmediateDependants(
            rainCharacter,
            [rainWord, groupedWord, sentence],
            schemas,
            catalog,
        ).map(({ id }) => id),
        ["rain-word", "grouped-word"],
    );
    assert.deepEqual(
        filterImmediateDependants(
            kana[3],
            [walkWord, sentence],
            schemas,
            catalog,
        ).map(({ id }) => id),
        ["walk-word"],
    );
});

test("direct neighbour filtering handles cyclic references without dropping independent direct links", async () => {
    const { filterImmediateDependants } =
        await import("../ui/app/composition-links.js");
    const target = entries[2];
    const first = {
        ...entries[1],
        id: "first",
        label: "First",
        references: [{ entryId: "second" }],
    };
    const second = {
        ...entries[1],
        id: "second",
        label: "Second",
        references: [{ entryId: "first" }],
    };
    const direct = {
        ...word,
        id: "direct",
        label: "Direct",
        references: [{ entryId: target.id }, { entryId: first.id }],
    };
    assert.deepEqual(
        filterImmediateDependants(target, [direct], schemas, [
            target,
            first,
            second,
            direct,
        ]),
        [direct],
    );
});
