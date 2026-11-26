import assert from "node:assert/strict";
import test from "node:test";
import { validateLibrarySchema } from "../layers.js";
import type { LibrarySchema } from "../types.js";

test("generated grammar validates flags, ordered alternatives and irregular definition overrides", () => {
    const metadata = { labels: { en: "Forms" } };
    const schema: LibrarySchema = {
        id: "grammar",
        namespace: "grammar",
        language: "en",
        version: 1,
        metadata,
        layers: [{ id: "words", metadata }],
        transformSets: [
            {
                id: "verbs",
                flag: "transform:verb",
                matchTags: ["verb"],
                baseState: "base",
                metadata,
                rules: [
                    {
                        id: "past",
                        metadata,
                        fromState: "base",
                        toState: "past",
                        removeSuffix: "",
                        append: "ed",
                        suffixes: [{ removeSuffix: "y", append: "ied" }],
                        forms: {
                            run: {
                                removeSuffix: "run",
                                append: "ran",
                                definitionTransform: {
                                    template: "{{ definition }} (past)",
                                },
                            },
                        },
                    },
                ],
            },
        ],
    };
    assert.deepEqual(validateLibrarySchema(schema), schema);
    for (const [mutate, code] of [
        [
            (copy: LibrarySchema) => {
                delete (copy.transformSets![0] as { flag?: string }).flag;
            },
            "transform_flag_required",
        ],
        [
            (copy: LibrarySchema) => {
                copy.transformSets![0].rules[0].forms!.run.definitionTransform!.template =
                    "";
            },
            "invalid_transform_definition",
        ],
        [
            (copy: LibrarySchema) => {
                copy.transformSets![0].rules[0].suffixes = [
                    {
                        removeSuffix: "x",
                        append: "x",
                        suffixes: [{ removeSuffix: "x", append: "x" }],
                    },
                ];
            },
            "invalid_transform_rule",
        ],
    ] as const) {
        const copy = structuredClone(schema);
        mutate(copy);
        assert.throws(() => validateLibrarySchema(copy), new RegExp(code));
    }
});
