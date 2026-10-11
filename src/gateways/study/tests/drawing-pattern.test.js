import assert from "node:assert/strict";
import test from "node:test";
import { drawingPattern } from "../ui/reuse/drawing-pattern.js";

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
