import assert from "node:assert/strict";
import test from "node:test";
import { validateReferenceTransformation } from "../../layers/reference-transformation.js";
import type { LibraryEntry, LibrarySchema } from "../../types.js";

test("server rejects plural references until the base card opts into the family", () => {
    const schema = {
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
    } as LibrarySchema;
    const target = { label: "dog", tags: ["countable"] } as LibraryEntry;
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
