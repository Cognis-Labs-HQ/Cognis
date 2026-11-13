import { createEntry, createSchema } from "../reuse/fixtures.js";
import assert from "node:assert/strict";
import test from "node:test";
import { validateReferenceTransformation } from "../../layers/reference-transformation.js";

test("server rejects plural references until the base card opts into the family", () => {
    const schema = createSchema({
        transformSets: [
            {
                id: "noun",
                flag: "plural",
                matchTags: ["countable"],
                baseState: "base",
                rules: [
                    {
                        id: "plural",
                        fromState: "base",
                        toState: "plural",
                        removeSuffix: "",
                        append: "s",
                    },
                ],
            },
        ],
    });
    const target = createEntry({ label: "dog", tags: ["countable"] });
    const reference = {
        entryId: "dog",
        relation: "words",
        transformation: { setId: "noun", path: ["plural"] },
    };
    assert.throws(
        () => validateReferenceTransformation(schema, reference, target),
        /invalid_reference_transformation/,
    );
    target.tags!.push("plural");
    assert.doesNotThrow(() =>
        validateReferenceTransformation(schema, reference, target),
    );
});
