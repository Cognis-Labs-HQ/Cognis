import assert from "node:assert/strict";
import test from "node:test";
import { similarEntries } from "../ui/app/similar-items.js";

const source = {
    id: "school",
    schemaId: "ja",
    layer: "words",
    language: "ja",
    label: "学校",
    fields: { pronunciation: "がっこう", tags: ["education"] },
    references: [{ entryId: "character-school" }],
};

test("similar items rank shared writing, vocabulary metadata, and references", () => {
    const result = similarEntries(source, [
        source,
        { ...source, id: "school-life", label: "学校生活" },
        {
            ...source,
            id: "student",
            label: "学生",
            references: [{ entryId: "character-school" }],
        },
        { ...source, id: "cat", label: "猫", fields: {}, references: [] },
        { ...source, id: "sentence", layer: "sentences", label: "学校です" },
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
        label: `学校${index}`,
        hidden: index === 0,
    }));
    assert.equal(similarEntries(source, candidates, 3).length, 3);
    assert.ok(!similarEntries(source, candidates).some(({ hidden }) => hidden));
});
