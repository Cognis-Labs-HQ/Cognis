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
        id: "japanese",
        layers: [
            { id: "characters", semanticRole: "atomicWritingUnit" },
            { id: "alt-characters", semanticRole: "compoundWritingUnit" },
            { id: "words", semanticRole: "lexicalUnit" },
        ],
    },
];
const word = {
    id: "word-suki",
    schemaId: "japanese",
    layer: "words",
    language: "ja",
};
const entries = [
    word,
    {
        id: "kanji-suki",
        schemaId: "japanese",
        layer: "alt-characters",
        language: "ja",
        label: "好",
    },
    {
        id: "hiragana-su",
        schemaId: "japanese",
        layer: "characters",
        language: "ja",
        label: "す",
    },
    {
        id: "hiragana-ki",
        schemaId: "japanese",
        layer: "characters",
        language: "ja",
        label: "き",
    },
];

test("word spellings resolve every writing-unit component", () => {
    assert.deepEqual(
        resolveLabelComposition("好き", word, schemas, entries).map(
            ({ id }) => id,
        ),
        ["kanji-suki", "hiragana-ki"],
    );
    assert.deepEqual(
        resolveLabelComposition("すき", word, schemas, entries).map(
            ({ id }) => id,
        ),
        ["hiragana-su", "hiragana-ki"],
    );
});

test("partially resolvable spellings do not produce misleading links", () => {
    assert.deepEqual(
        resolveLabelComposition("未知", word, schemas, entries),
        [],
    );
});

test("ordered relationship targets resolve pronunciation aliases", () => {
    const mountain = {
        id: "word-yama",
        label: "山",
        fields: { pronunciation: ["やま"] },
    };
    const from = { id: "particle-kara", label: "から" };
    const river = {
        id: "word-kawa",
        label: "川",
        fields: { pronunciation: "かわ" },
    };
    const until = { id: "particle-made", label: "まで" };

    assert.deepEqual(
        resolveReferenceAliasComposition("やまからかわまで", [
            mountain,
            from,
            river,
            until,
        ]).map(({ id }) => id),
        ["word-yama", "particle-kara", "word-kawa", "particle-made"],
    );
    assert.deepEqual(
        resolveReferenceAliasComposition("やまから海まで", [
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
            label: "じん",
            fields: { pronunciation: ["じん"] },
        }),
        [],
    );
    assert.deepEqual(
        distinctPronunciationLabels(
            {
                label: "人",
                fields: { pronunciation: ["じん", "にん", "ひと"] },
            },
            ["ひと"],
        ),
        ["じん", "にん"],
    );
});

test("title detail omits links already composing the primary title", () => {
    const kana = { id: "kana-ka", label: "か" };
    const otherKana = { id: "kana-ga", label: "が" };

    assert.deepEqual(
        excludeTitleReferenceDuplicates(
            [[kana], [otherKana]],
            [{ id: "kana-ka", label: " か " }],
        ),
        [[otherKana]],
    );
    assert.deepEqual(
        excludeTitleReferenceDuplicates(
            [[kana]],
            [{ id: "different-target", label: "か" }],
        ),
        [[kana]],
    );
});
