import assert from "node:assert/strict";
import test from "node:test";
import {
    transformedDefinition,
    transformedDefinitions,
    transformationPathways,
} from "../ui/app/transformations.js";
import {
    compositionTokenLabel,
    restoreCompositionTokens,
    transformationTokenDetails,
} from "../ui/app/composition-tokens.js";

test("sentence edits restore repeated punctuation in authored order", () => {
    const entries = [
        { id: "one", label: "transition" },
        { id: "two", label: "talk" },
    ];
    const tokens = restoreCompositionTokens(
        {
            label: "transition,talk?!",
            references: [
                { entryId: "one", relation: "tokens", position: 0 },
                { entryId: "two", relation: "tokens", position: 1 },
            ],
        },
        entries,
        {
            literal_carousels: [{ values: [",", "?", "!"] }],
        },
        new Set(["tokens"]),
    );
    assert.equal(
        tokens.map((token) => compositionTokenLabel(token, entries)).join(""),
        "transition,talk?!",
    );
});

test("provider transform sets derive pathways without materialized cards", () => {
    const schema = {
        transformSets: [
            {
                id: "verb",
                matchTags: ["verb"],
                baseState: "base",
                rules: [
                    {
                        id: "potential",
                        fromState: "base",
                        toState: "potential",
                        removeSuffix: "k",
                        append: "ked",
                    },
                    {
                        id: "negative",
                        fromState: "base",
                        toState: "negative",
                        removeSuffix: "k",
                        append: "k-not",
                    },
                    {
                        id: "desiderative",
                        fromState: "base",
                        toState: "desiderative",
                        removeSuffix: "k",
                        append: "king",
                    },
                ],
            },
        ],
    };
    const [pathway] = transformationPathways(
        { label: "talk", tags: ["verb"] },
        schema,
    );
    assert.deepEqual(
        pathway.nodes.map(({ value }) => value),
        ["talk", "talked", "talk-not", "talking"],
    );
});

test("transform sets ignore entries without every matching tag", () => {
    const schema = {
        transformSets: [
            {
                matchTags: ["verb", "verb-group-a"],
                baseState: "base",
                rules: [],
            },
        ],
    };
    assert.deepEqual(
        transformationPathways({ label: "talk", tags: ["verb"] }, schema),
        [],
    );
});

test("transform pathways support branching chains with dynamic readings and definitions", () => {
    const schema = {
        language: "en",
        transformSets: [
            {
                id: "verb-group-b",
                matchTags: ["verb", "verb-group-b"],
                baseState: "base",
                rules: [
                    {
                        id: "causative",
                        metadata: { labels: { en: "Causative" } },
                        fromState: "base",
                        toState: "causative",
                        removeSuffix: "a",
                        append: "ax",
                    },
                    {
                        id: "desire",
                        metadata: { labels: { en: "Desire" } },
                        definition: { labels: { en: "want to make eat" } },
                        fromState: "causative",
                        toState: "causative-desire",
                        removeSuffix: "x",
                        append: "ying",
                    },
                    {
                        id: "negative-desire",
                        metadata: { labels: { en: "Negative desire" } },
                        fromState: "causative-desire",
                        toState: "causative-negative-desire",
                        removeSuffix: "ing",
                        append: "ed",
                    },
                    {
                        id: "continuous-negative-desire",
                        metadata: {
                            labels: { en: "Continuous negative desire" },
                        },
                        fromState: "causative-negative-desire",
                        toState: "causative-continuous-negative-desire",
                        removeSuffix: "yed",
                        append: "yously",
                    },
                ],
            },
        ],
    };
    const entry = {
        id: "eat",
        label: "mora",
        tags: ["verb", "verb-group-b"],
        fields: { pronunciation: ["mora"] },
    };
    const [pathway] = transformationPathways(entry, schema);
    assert.deepEqual(
        pathway.nodes.map(({ value }) => value),
        ["mora", "morax", "moraying", "morayed", "morayously"],
    );
    const [token] = restoreCompositionTokens(
        {
            label: "morayously",
            references: [{ entryId: "eat", relation: "words", position: 0 }],
        },
        [entry],
        { literal_carousels: [] },
        new Set(["words"]),
        schema,
    );
    assert.equal(compositionTokenLabel(token, [entry]), "morayously");
    assert.deepEqual(transformationTokenDetails(token).path, [
        "causative",
        "desire",
        "negative-desire",
        "continuous-negative-desire",
    ]);
});

test("definition templates transform localized definition boundaries", () => {
    assert.equal(
        transformedDefinition(
            "to watch",
            {
                rule: {
                    definitionTransform: {
                        matchPrefix: { labels: { en: "to " } },
                        template: {
                            labels: { en: "{{ prefix }}(want to) {{ stem }}" },
                        },
                    },
                },
            },
            "en",
        ),
        "to (want to) watch",
    );
    assert.equal(
        transformedDefinition(
            "to see",
            {
                rule: {
                    definitionTransform: {
                        matchPrefix: "to ",
                        template: "{{ prefix }}be able to {{ stem }}",
                    },
                },
            },
            "en",
        ),
        "to be able to see",
    );
});

test("definition templates preserve every referenced definition", () => {
    assert.deepEqual(
        transformedDefinitions(
            ["to see", "to watch"],
            {
                rule: {
                    definitionTransform: {
                        matchPrefix: "to ",
                        template: "{{ prefix }}(want to) {{ stem }}",
                    },
                },
            },
            "en",
        ),
        ["to (want to) see", "to (want to) watch"],
    );
});

test("definition templates compose across a transformation path", () => {
    assert.equal(
        transformedDefinition(
            "to drink",
            {
                definitionRules: [
                    {
                        definitionTransform: {
                            matchPrefix: "to ",
                            template: "{{ prefix }}make someone {{ stem }}",
                        },
                    },
                    {
                        definitionTransform: {
                            matchPrefix: "to ",
                            template: "{{ prefix }}want to {{ stem }}",
                        },
                    },
                ],
            },
            "en",
        ),
        "to want to make someone drink",
    );
});

test("definition substitutions correct earlier transformations in context", () => {
    const desire = {
        definitionTransform: {
            matchPrefix: "to ",
            template: "{{ prefix }}(want to) {{ stem }}",
        },
    };
    assert.equal(
        transformedDefinition(
            "to exist",
            {
                definitionRules: [
                    desire,
                    {
                        definitionTransform: {
                            replacements: [
                                {
                                    match: "(want to)",
                                    replacement: "(have wanted to)",
                                },
                            ],
                        },
                    },
                ],
            },
            "en",
        ),
        "to (have wanted to) exist",
    );
    assert.equal(
        transformedDefinition(
            "to exist",
            {
                definitionRules: [
                    desire,
                    {
                        definitionTransform: {
                            template: "{{ definition }} (and then)",
                        },
                    },
                ],
            },
            "en",
        ),
        "to (want to) exist (and then)",
    );
});
