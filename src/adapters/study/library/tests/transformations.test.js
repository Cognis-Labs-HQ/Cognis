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
        { id: "one", label: "それでも" },
        { id: "two", label: "歩く" },
    ];
    const tokens = restoreCompositionTokens(
        {
            label: "それでも、歩く？！",
            references: [
                { entryId: "one", relation: "tokens", position: 0 },
                { entryId: "two", relation: "tokens", position: 1 },
            ],
        },
        entries,
        {
            literal_carousels: [{ values: ["、", "？", "！"] }],
        },
        new Set(["tokens"]),
    );
    assert.equal(
        tokens.map((token) => compositionTokenLabel(token, entries)).join(""),
        "それでも、歩く？！",
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
                        removeSuffix: "く",
                        append: "ける",
                    },
                    {
                        id: "negative",
                        fromState: "base",
                        toState: "negative",
                        removeSuffix: "く",
                        append: "かない",
                    },
                    {
                        id: "desiderative",
                        fromState: "base",
                        toState: "desiderative",
                        removeSuffix: "く",
                        append: "きたい",
                    },
                ],
            },
        ],
    };
    const [pathway] = transformationPathways(
        { label: "歩く", tags: ["verb"] },
        schema,
    );
    assert.deepEqual(
        pathway.nodes.map(({ value }) => value),
        ["歩く", "歩ける", "歩かない", "歩きたい"],
    );
});

test("transform sets ignore entries without every matching tag", () => {
    const schema = {
        transformSets: [
            {
                matchTags: ["verb", "godan-ku"],
                baseState: "base",
                rules: [],
            },
        ],
    };
    assert.deepEqual(
        transformationPathways({ label: "歩く", tags: ["verb"] }, schema),
        [],
    );
});

test("transform pathways support branching chains with dynamic readings and definitions", () => {
    const schema = {
        language: "en",
        transformSets: [
            {
                id: "ichidan",
                matchTags: ["verb", "ichidan"],
                baseState: "base",
                rules: [
                    {
                        id: "causative",
                        metadata: { labels: { en: "Causative" } },
                        fromState: "base",
                        toState: "causative",
                        removeSuffix: "る",
                        append: "させる",
                    },
                    {
                        id: "desire",
                        metadata: { labels: { en: "Desire" } },
                        definition: { labels: { en: "want to make eat" } },
                        fromState: "causative",
                        toState: "causative-desire",
                        removeSuffix: "る",
                        append: "たい",
                    },
                    {
                        id: "negative-desire",
                        metadata: { labels: { en: "Negative desire" } },
                        fromState: "causative-desire",
                        toState: "causative-negative-desire",
                        removeSuffix: "たい",
                        append: "たくない",
                    },
                    {
                        id: "continuous-negative-desire",
                        metadata: {
                            labels: { en: "Continuous negative desire" },
                        },
                        fromState: "causative-negative-desire",
                        toState: "causative-continuous-negative-desire",
                        removeSuffix: "ない",
                        append: "なくて",
                    },
                ],
            },
        ],
    };
    const entry = {
        id: "eat",
        label: "食べる",
        tags: ["verb", "ichidan"],
        fields: { pronunciation: ["たべる"] },
    };
    const [pathway] = transformationPathways(entry, schema);
    assert.deepEqual(
        pathway.nodes.map(({ value }) => value),
        [
            "食べる",
            "食べさせる",
            "食べさせたい",
            "食べさせたくない",
            "食べさせたくなくて",
        ],
    );
    const [token] = restoreCompositionTokens(
        {
            label: "食べさせたくなくて",
            references: [{ entryId: "eat", relation: "words", position: 0 }],
        },
        [entry],
        { literal_carousels: [] },
        new Set(["words"]),
        schema,
    );
    assert.equal(compositionTokenLabel(token, [entry]), "食べさせたくなくて");
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
