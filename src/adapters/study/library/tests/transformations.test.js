import assert from "node:assert/strict";
import test from "node:test";
import { transformationPathways } from "../ui/app/transformations.js";
import {
    compositionTokenLabel,
    restoreCompositionTokens,
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
