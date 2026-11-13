import assert from "node:assert/strict";
import test from "node:test";
import { tableLabels } from "../localization.js";

test("leaderboard labels use the requested language and English when it is unavailable", async () => {
    assert.equal((await tableLabels("ja-JP")).you, "あなた");
    assert.equal((await tableLabels("zz")).you, "You");
});

test("leaderboard rejects missing English labels instead of displaying a raw key", async () => {
    await assert.rejects(
        tableLabels("de", async () => "<resources/>"),
        /missing_translation/,
    );
});
