import test from "node:test";
import assert from "node:assert/strict";
import { createPracticeSession } from "../ui/app/flashcards/practice-session.js";
import {
    flashcardsRoute,
    deckMatchesLanguage,
} from "../ui/app/flashcards/language.js";

test("Previous revisits answered cards, including after the last card, without losing grades", () => {
    const session = createPracticeSession([{ id: "first" }, { id: "second" }]);
    session.next("good");
    session.next("again");
    assert.equal(session.current, undefined);
    session.previous();
    assert.equal(session.current.id, "second");
    assert.equal(session.answeredGrade, "again");
    session.previous();
    assert.equal(session.current.id, "first");
    assert.equal(session.answeredGrade, "good");
    assert.equal(session.canPrevious, false);
});

test("language routes and deck metadata separate galleries without depending on the interface language", () => {
    assert.deepEqual(flashcardsRoute("/study/ja/flashcards/deck"), {
        language: "ja",
        deckId: "deck",
    });
    assert.equal(deckMatchesLanguage({ language: "en" }, "ja"), false);
    assert.equal(
        deckMatchesLanguage({ schemas: [{ language: "ja" }] }, "ja"),
        true,
    );
    assert.equal(
        deckMatchesLanguage(
            { language: "en", schemas: [{ language: "ja" }] },
            "ja",
        ),
        false,
    );
});
