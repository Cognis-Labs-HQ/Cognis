import test from "node:test";
import assert from "node:assert/strict";
import { parseAnkiNotes, exportAnkiNotes } from "../ui/anki.js";

test("Anki TSV preserves quotes, tabs, multiline text, and lines beginning with a hash", () => {
    const notes = [
        {
            front: 'A "quoted"\tquestion',
            back: "First line\n#part of answer\nThird",
            pronunciation: "reading",
        },
    ];
    assert.deepEqual(parseAnkiNotes(exportAnkiNotes("Deck", notes)), notes);
});
test("plain Anki notes import without Cognis metadata", () => {
    assert.deepEqual(parseAnkiNotes("Question\tAnswer\n"), [
        { front: "Question", back: "Answer", pronunciation: undefined },
    ]);
});
test("malformed or empty TSV cannot create an empty deck", () => {
    assert.throws(
        () => parseAnkiNotes('"unfinished\tanswer'),
        /invalid_anki_quotes/,
    );
    assert.throws(() => parseAnkiNotes(""), /empty_deck/);
});
