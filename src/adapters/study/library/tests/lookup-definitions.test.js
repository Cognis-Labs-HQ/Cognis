import assert from "node:assert/strict";
import test from "node:test";
import { separateLookupDefinitions } from "../ui/app/create-entry/lookup-definitions.js";

test("dictionary glosses become individual definitions with aligned translations", () => {
    const input = [
        {
            translations: {
                en: "teach; faith； doctrine; ",
                de: "lehren; Glaube; Lehre",
            },
            provenance: "jisho:教",
        },
    ];
    const result = separateLookupDefinitions(input);
    assert.deepEqual(
        result.map(({ translations }) => translations),
        [
            { en: "teach", de: "lehren" },
            { en: "faith", de: "Glaube" },
            { en: "doctrine", de: "Lehre" },
        ],
    );
    assert.equal(new Set(result.map(({ provenance }) => provenance)).size, 3);
    assert.equal(input[0].translations.en, "teach; faith； doctrine; ");
});

test("unsplittable translations are retained once and individual meanings stay intact", () => {
    const result = separateLookupDefinitions([
        { translations: { en: "teach; faith", ja: "教え" } },
        { translations: { en: "room" } },
    ]);
    assert.deepEqual(
        result.map(({ translations }) => translations),
        [{ en: "teach", ja: "教え" }, { en: "faith" }, { en: "room" }],
    );
});
