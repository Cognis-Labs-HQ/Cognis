import assert from "node:assert/strict";
import test from "node:test";
import { similarEntries } from "../ui/app/similar-items.js";

const source = {
    id: "school",
    schemaId: "x-mock",
    layer: "words",
    language: "x-mock",
    label: "academy",
    fields: { pronunciation: "academy-reading", tags: ["education"] },
    references: [{ entryId: "character-school" }],
};

test("similar items rank shared writing, vocabulary metadata, and references", () => {
    const result = similarEntries(source, [
        source,
        { ...source, id: "school-life", label: "academy-life" },
        {
            ...source,
            id: "student",
            label: "student",
            references: [{ entryId: "character-school" }],
        },
        { ...source, id: "unrelated", label: "qx", fields: {}, references: [] },
        {
            ...source,
            id: "sentence",
            layer: "sentences",
            label: "academy sentence",
        },
    ]);

    assert.deepEqual(
        result.map(({ id }) => id),
        ["school-life", "student"],
    );
});

test("similar items omit hidden candidates and enforce the result limit", () => {
    const candidates = Array.from({ length: 8 }, (_, index) => ({
        ...source,
        id: `candidate-${index}`,
        label: `academy-${index}`,
        hidden: index === 0,
    }));
    assert.equal(similarEntries(source, candidates, 3).length, 3);
    assert.ok(!similarEntries(source, candidates).some(({ hidden }) => hidden));
});
