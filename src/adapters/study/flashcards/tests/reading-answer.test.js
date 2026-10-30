import test from "node:test";
import assert from "node:assert/strict";
import {
    readingAnswerKey,
    isCorrectReadingChoice,
} from "../ui/reuse/reading-answer.js";

test("answer comparison ignores terminal punctuation, Unicode formatting and whitespace", () => {
    for (const [expected, submitted] of [
        ["I am a student.", "I am a student"],
        ["I am a student!", "  I  AM\u00a0a student .  "],
        ["word?", "word!? ."],
        ["私は学生です。", "私は学生です"],
        ["Ｉ ａｍ ａ ｓｔｕｄｅｎｔ．", "I am a student"],
        ["Ich lerne…", "ich lerne"],
        ["don’t stop.", "don't stop"],
        ["re‑sign", "re-sign"],
    ]) {
        assert.equal(readingAnswerKey(submitted), readingAnswerKey(expected));
        assert.equal(
            isCorrectReadingChoice({ text: submitted, correct: false }, [
                { text: expected, correct: true },
            ]),
            true,
        );
    }
});

test("comparison preserves meaningful words, numbers, accents and internal punctuation", () => {
    for (const [expected, submitted] of [
        ["I am a student", "I am not a student"],
        ["Yes, I am a student.", "I am a student"],
        ["1.5", "15"],
        ["-1", "1"],
        ["can't", "cant"],
        ["re-sign", "resign"],
        ["schön", "schon"],
        ["C++", "C"],
    ]) {
        assert.equal(
            isCorrectReadingChoice({ text: submitted }, [
                { text: expected, correct: true },
            ]),
            false,
        );
    }
    assert.equal(
        isCorrectReadingChoice({ text: "..." }, [
            { text: "...", correct: true },
        ]),
        false,
    );
    assert.equal(isCorrectReadingChoice(undefined, []), false);
});
