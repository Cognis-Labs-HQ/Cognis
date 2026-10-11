import assert from "node:assert/strict";
import test from "node:test";
import { compactDrawingPattern } from "../ui/layout.js";
import { drawingViewport } from "../ui/viewport.js";

function compositePattern(bounds) {
    return {
        coordinateSystem: "normalized",
        tolerance: 55,
        columns: bounds.length,
        groups: bounds.map(() => 1),
        strokes: bounds.map(([left, right], column) => ({
            points: [
                {
                    x: (column + left) / bounds.length,
                    y: 0.1,
                    t: 0,
                    pressure: 0.5,
                },
                {
                    x: (column + right) / bounds.length,
                    y: 0.9,
                    t: 100,
                    pressure: 0.7,
                },
            ],
        })),
    };
}

function closeTo(actual, expected) {
    assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
}

test("narrow characters use their stroke widths with a consistent gap", () => {
    const pattern = compositePattern([
        [0.4, 0.6],
        [0.25, 0.7],
        [0.2, 0.7],
    ]);
    const original = structuredClone(pattern);
    const compact = compactDrawingPattern(pattern);

    closeTo(compact.aspectRatio, 1.6);
    assert.equal(compact.columns, 3);
    assert.deepEqual(compact.groups, pattern.groups);
    assert.equal(compact.tolerance, pattern.tolerance);
    assert.deepEqual(pattern, original);
    for (let index = 0; index < compact.strokes.length; index += 1) {
        const [start, end] = compact.strokes[index].points;
        const [originalStart, originalEnd] = pattern.strokes[index].points;
        closeTo(
            (end.x - start.x) * compact.aspectRatio,
            (originalEnd.x - originalStart.x) * pattern.columns,
        );
        assert.deepEqual({ ...start, x: originalStart.x }, originalStart);
        assert.deepEqual({ ...end, x: originalEnd.x }, originalEnd);
        if (index > 0) {
            const previous = compact.strokes[index - 1].points.at(-1);
            closeTo((start.x - previous.x) * compact.aspectRatio, 0.15);
        }
    }
});

test("compacted patterns retain character proportions and pointer mapping on resize", () => {
    const compact = compactDrawingPattern(
        compositePattern([
            [0.4, 0.6],
            [0.2, 0.8],
        ]),
    );
    for (const canvas of [
        { width: 900, height: 200 },
        { width: 180, height: 500 },
    ]) {
        const viewport = drawingViewport(canvas, compact.aspectRatio);
        closeTo(viewport.width / viewport.height, compact.aspectRatio);
        for (const stroke of compact.strokes) {
            for (const point of stroke.points) {
                const x = viewport.x + point.x * viewport.width;
                const y = viewport.y + point.y * viewport.height;
                closeTo((x - viewport.x) / viewport.width, point.x);
                closeTo((y - viewport.y) / viewport.height, point.y);
                assert.ok(x >= 0 && x <= canvas.width);
                assert.ok(y >= 0 && y <= canvas.height);
            }
        }
    }
});

test("groups retain all strokes and very narrow pieces center in a square stage", () => {
    const pattern = compositePattern([
        [0.5, 0.5],
        [0.5, 0.5],
    ]);
    pattern.strokes.splice(1, 0, structuredClone(pattern.strokes[0]));
    pattern.groups = [2, 1];
    const compact = compactDrawingPattern(pattern);
    assert.equal(compact.aspectRatio, 1);
    assert.deepEqual(compact.groups, [2, 1]);
    assert.equal(compact.strokes.length, 3);
    closeTo(compact.strokes[0].points[0].x, 0.425);
    closeTo(compact.strokes[2].points[0].x, 0.575);
});

test("single character patterns retain their original geometry", () => {
    const pattern = compositePattern([[0.1, 0.9]]);
    assert.equal(compactDrawingPattern(pattern), pattern);
    delete pattern.columns;
    assert.equal(compactDrawingPattern(pattern), pattern);
});

test("full-width characters keep their existing spacing", () => {
    const pattern = compositePattern([
        [0, 1],
        [0, 1],
    ]);
    assert.equal(compactDrawingPattern(pattern), pattern);
});
