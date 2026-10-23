import test from "node:test";
import assert from "node:assert/strict";
import { declarationSpacingIssues } from "../scripts/declaration-spacing.mjs";

test("readability guard rejects compressed functions and class methods", () => {
    assert.deepEqual(
        declarationSpacingIssues("function first() {}\nfunction second() {}\n"),
        [2],
    );
    assert.deepEqual(
        declarationSpacingIssues(
            "class C {\n    first() {}\n    second() {}\n}\n",
        ),
        [3],
    );
});

test("readability guard preserves documented boundaries without flagging object literals", () => {
    assert.deepEqual(
        declarationSpacingIssues(
            "function first() {}\n\n/** Second operation. */\nfunction second() {}\n",
        ),
        [],
    );
    assert.deepEqual(
        declarationSpacingIssues(
            "const handlers = { first() {}, second() {} };\n",
        ),
        [],
    );
});
