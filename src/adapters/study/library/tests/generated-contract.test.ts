import assert from "node:assert/strict";
import test from "node:test";
import { validateGeneratedTransformations } from "../reuse/generated-transformations.js";
import {
    referencedTransformation,
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
                flag: "transform:plural",
                matchTags: ["noun"],
                baseState: "base",
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
        tags: ["noun", "plural", "transform:plural"],
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

test("flagged sources generate required forms without storing variant cards", () => {
    const { schema, source } = fixture();
    assert.doesNotThrow(() =>
        validateGeneratedTransformations(schema, [source]),
    );
    assert.equal(
        transformationPathways(source, schema)[0].nodes[1].value,
        "私たち",
    );
    const another = {
        ...source,
        id: "another",
        label: "あなた",
        fields: { pronunciation: ["あなた"] },
    };
    assert.doesNotThrow(() =>
        validateGeneratedTransformations(schema, [source, another]),
    );
    assert.equal(
        transformationPathways(another, schema)[0].nodes[1].value,
        "あなたたち",
    );
    assert.doesNotThrow(() =>
        validateGeneratedTransformations(schema, [
            { ...source, tags: ["noun"] },
        ]),
    );
    schema.transformSets![0].rules[0].removeSuffix = "unmatched";
    assert.throws(
        () => validateGeneratedTransformations(schema, [source]),
        /unresolved_transform_flag/,
    );
});

test("authored variant records and unsupported flags fail the content contract", () => {
    const { schema, source, derived } = fixture();
    for (const invalid of [
        derived,
        { ...derived, tags: ["inflected"] },
        {
            ...derived,
            referenceTransformation: { setId: "plural", path: ["plural"] },
        },
        {
            ...derived,
            references: [{ entryId: source.id, relation: "inflected-from" }],
        },
    ])
        assert.throws(
            () => validateGeneratedTransformations(schema, [source, invalid]),
            /generated_transformation_readonly/,
        );
    assert.throws(
        () =>
            validateGeneratedTransformations(schema, [
                { ...source, tags: ["transform:unknown"] },
            ]),
        /unresolved_transform_flag/,
    );
});

test("path validation preserves convergent paths and expansion rejects growth cycles", () => {
    const { schema, source } = fixture();
    const set = schema.transformSets![0];
    set.rules = [...set.rules, { ...set.rules[0], id: "alternative" }];
    assert.equal(
        referencedTransformation(source, schema, {
            setId: "plural",
            path: ["alternative"],
        })?.node.value,
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

test("generated adverbs carry their output class and cannot be authored under that class", () => {
    const { schema, source } = fixture("soft", "soft", "ly");
    const set = schema.transformSets![0];
    set.id = "adverb";
    set.flag = "transform:adverb";
    set.rules[0].id = "adverb";
    set.rules[0].toState = "adverb";
    set.matchTags = ["adjective"];
    set.rules[0].resultClass = "lexical:adverb";
    const adjective = {
        ...source,
        class: "lexical:adjective",
        tags: ["adjective", set.flag],
    };
    assert.equal(
        referencedTransformation(adjective, schema, {
            setId: set.id,
            path: ["adverb"],
        })?.node.class,
        "lexical:adverb",
    );
    const copy = {
        id: "copy",
        layer: "words",
        class: "lexical:adverb",
        label: "softly",
        fields: { pronunciation: ["softly"] },
    };
    assert.throws(
        () => validateGeneratedTransformations(schema, [adjective, copy]),
        /generated_transformation_readonly/,
    );
});

test("a productive source still rejects a missing declared branch", () => {
    const { schema, source } = fixture();
    const set = schema.transformSets![0];
    set.rules = [
        ...set.rules,
        {
            ...set.rules[0],
            id: "missing",
            toState: "missing",
            removeSuffix: "unmatched",
        },
    ];
    assert.throws(
        () => validateGeneratedTransformations(schema, [source]),
        /unresolved_transform_flag:transform:plural:plural:missing/,
    );
});
