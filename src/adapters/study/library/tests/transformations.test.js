import assert from "node:assert/strict";
import test from "node:test";
import { transformationPathways } from "../ui/app/transformations.js";

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
