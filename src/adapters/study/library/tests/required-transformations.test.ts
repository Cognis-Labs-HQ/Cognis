import assert from "node:assert/strict";
import test from "node:test";
import { validateRequiredTransformationCards } from "../reuse/required-transformations.js";
import {
    resolveTransformation,
    transformationPathways,
} from "../ui/reuse/transformations.js";
import type { LibrarySchema } from "../types.js";

function fixture(
    label = "私",
    pronunciation = "わたし",
    append = "たち",
    readingAppend = append,
) {
    const metadata = { labels: { en: "Forms" } };
    const schema: LibrarySchema = {
        id: "fixture",
        namespace: "fixture",
        version: 1,
        language: "ja",
        metadata,
        layers: [
            {
                id: "words",
                metadata,
                fields: [{ id: "pronunciation", type: "stringList", metadata }],
            },
        ],
        transformSets: [
            {
                id: "plural",
                metadata,
                matchTags: ["noun"],
                optInTag: "plural",
                baseState: "base",
                requiredCardStates: ["plural"],
                rules: [
                    {
                        id: "plural",
                        metadata,
                        fromState: "base",
                        toState: "plural",
                        removeSuffix: "",
                        append,
                        pronunciation: {
                            removeSuffix: "",
                            append: readingAppend,
                        },
                    },
                ],
            },
        ],
    };
    const source = {
        id: "source",
        layer: "words",
        label,
        tags: ["noun", "plural"],
        fields: { pronunciation: [pronunciation] },
    };
    const derived = {
        id: "derived",
        layer: "words",
        label: label + append,
        fields: { pronunciation: [pronunciation + readingAppend] },
        references: [
            {
                entryId: source.id,
                relation: "source",
                transformation: { setId: "plural", path: ["plural"] },
            },
        ],
    };
    return { schema, source, derived };
}

test("declared transformations require linked materialized cards with exact readings", () => {
    const { schema, source, derived } = fixture();
    assert.throws(
        () => validateRequiredTransformationCards(schema, [source]),
        /required_transform_card_count:source:plural:plural:0/,
    );
    assert.doesNotThrow(() =>
        validateRequiredTransformationCards(schema, [source, derived]),
    );
    for (const incorrect of [
        { ...derived, label: "私ら" },
        { ...derived, fields: { pronunciation: ["わたしら"] } },
    ])
        assert.throws(
            () =>
                validateRequiredTransformationCards(schema, [
                    source,
                    incorrect,
                ]),
            /required_transform_card_mismatch/,
        );
    for (const incorrect of [
        { ...derived, references: [] },
        { ...derived, layer: "sentences" },
        {
            ...derived,
            references: [
                ...derived.references,
                { ...derived.references[0], entryId: "homophone" },
            ],
        },
        {
            ...derived,
            references: [{ ...derived.references[0], entryId: "homophone" }],
        },
    ])
        assert.throws(
            () =>
                validateRequiredTransformationCards(schema, [
                    source,
                    incorrect,
                ]),
            /required_transform_card_count/,
        );
    assert.throws(
        () =>
            validateRequiredTransformationCards(schema, [
                source,
                derived,
                { ...derived, id: "duplicate" },
            ]),
        /required_transform_card_count:source:plural:plural:2/,
    );
});

test("new qualifying cards expand requirements while ordinary nouns remain unaffected", () => {
    const { schema, source, derived } = fixture();
    const another = {
        ...source,
        id: "another",
        label: "あなた",
        fields: { pronunciation: ["あなた"] },
    };
    assert.throws(
        () =>
            validateRequiredTransformationCards(schema, [
                source,
                derived,
                another,
            ]),
        /required_transform_card_count:another/,
    );
    assert.doesNotThrow(() =>
        validateRequiredTransformationCards(schema, [
            { ...source, tags: ["noun"] },
        ]),
    );
    schema.transformSets![0].rules[0].removeSuffix = "unmatched";
    assert.throws(
        () => validateRequiredTransformationCards(schema, [source]),
        /unresolved_required_transform/,
    );
});

test("irregular and unchanged spellings remain distinct forms by source and path", () => {
    const { schema, source, derived } = fixture(
        "child",
        "/tʃaɪld/",
        "children",
        "/tʃɪldrən/",
    );
    const rule = schema.transformSets![0].rules[0];
    rule.removeSuffix = source.label;
    rule.pronunciation!.removeSuffix = source.fields.pronunciation[0];
    derived.label = "children";
    derived.fields.pronunciation = ["/tʃɪldrən/"];
    assert.doesNotThrow(() =>
        validateRequiredTransformationCards(schema, [source, derived]),
    );
    source.label = "read";
    source.fields.pronunciation = ["/riːd/"];
    rule.removeSuffix = "read";
    rule.append = "read";
    rule.pronunciation = { removeSuffix: "/riːd/", append: "/red/" };
    derived.label = "read";
    derived.fields.pronunciation = ["/red/"];
    assert.doesNotThrow(() =>
        validateRequiredTransformationCards(schema, [source, derived]),
    );
    assert.throws(
        () => validateRequiredTransformationCards(schema, [source]),
        /required_transform_card_count/,
    );
});

test("path validation preserves convergent paths and expansion rejects growth cycles", () => {
    const { schema, source } = fixture();
    const set = schema.transformSets![0];
    set.rules = [...set.rules, { ...set.rules[0], id: "alternative" }];
    assert.equal(
        resolveTransformation(source, schema, {
            setId: "plural",
            path: ["alternative"],
        })?.value,
        "私たち",
    );
    set.rules = [
        ...set.rules,
        {
            ...set.rules[0],
            id: "cycle",
            fromState: "plural",
            toState: "plural",
            removeSuffix: "",
            append: "x",
        },
    ];
    assert.throws(
        () => transformationPathways(source, schema),
        /cyclic_transform_rules/,
    );
});
