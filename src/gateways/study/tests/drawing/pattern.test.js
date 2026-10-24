import assert from "node:assert/strict";
import test from "node:test";
import { drawingPattern } from "../../ui/reuse/drawing-pattern.js";

const pattern = {
    strokes: [
        {
            points: [
                { x: 0.1, y: 0.2 },
                { x: 0.8, y: 0.9 },
            ],
        },
    ],
    tolerance: 60,
};
const atomic = {
    id: "letter",
    semanticRole: "atomicWritingUnit",
    fields: [{ id: "strokes", type: "strokePattern" }],
};
const schema = {
    id: "en",
    layers: [atomic, { id: "word", semanticRole: "lexicalEntry" }],
};
const letters = ["a", "b"].map((label) => ({
    id: label,
    label,
    schemaId: "en",
    layer: "letter",
    fields: { strokes: pattern },
}));

test("shared drawing patterns compose ordered writing units without changing provider strokes", () => {
    const entry = { id: "word", label: "aba", schemaId: "en", layer: "word" };
    const composite = drawingPattern(entry, schema.layers[1], letters, [
        schema,
    ]);
    assert.deepEqual(composite.groups, [1, 1, 1]);
    assert.equal(composite.columns, 3);
    assert.equal(composite.strokes.length, 3);
    assert.equal(pattern.strokes[0].points[0].x, 0.1);
    const phrase = drawingPattern(
        { ...entry, label: "ab a" },
        schema.layers[1],
        letters,
        [schema],
    );
    assert.deepEqual(phrase.groups, [1, 1, 1]);
    assert.equal(phrase.columns, 3);
    assert.deepEqual(
        drawingPattern(letters[0], atomic, letters, [schema]).groups,
        [1],
    );
    assert.equal(
        drawingPattern({ ...entry, label: "abc" }, schema.layers[1], letters, [
            schema,
        ]),
        undefined,
    );
    assert.equal(
        drawingPattern(
            entry,
            { semanticRole: "orderedLexicalSequence" },
            letters,
            [schema],
        ),
        undefined,
    );
});

test("provider-authored multi-character patterns preserve ordered character groups", () => {
    const authored = {
        ...pattern,
        columns: 2,
        groups: [1, 2],
        strokes: [pattern.strokes[0], pattern.strokes[0], pattern.strokes[0]],
    };
    const layer = { ...atomic, semanticRole: "compoundWritingUnit" };
    const entry = { ...letters[0], label: "ch", fields: { strokes: authored } };
    const result = drawingPattern(entry, layer);
    assert.deepEqual(result.groups, [1, 2]);
    assert.equal(result.columns, 2);
    assert.deepEqual(authored.groups, [1, 2]);
});
