import test from "node:test";
import assert from "node:assert/strict";
import { resolveElementGridSize } from "../page-composer/grid-sizing.js";

test("normalizes named grid width constraints", () => {
    assert.deepEqual(resolveElementGridSize({ gridSize: { max: "full" } }), {
        default: [4, 3],
        min: [2, 2],
        max: null,
        fullWidth: true,
        fillWidth: false,
        halfWidth: false,
        halfHeight: false,
        fillHeight: false,
    });
});

test("normalizes independent width and height constraints", () => {
    assert.deepEqual(
        resolveElementGridSize({
            gridSize: {
                default: [6, 4],
                min: [3, 2],
                max: ["half", 8],
            },
        }),
        {
            default: [6, 4],
            min: [3, 2],
            max: [null, 8],
            fullWidth: false,
            fillWidth: false,
            halfWidth: true,
            halfHeight: false,
            fillHeight: false,
        },
    );
});
