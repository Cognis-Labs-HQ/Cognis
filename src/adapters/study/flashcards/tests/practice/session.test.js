import test from "node:test";
import assert from "node:assert/strict";
import {
    createPracticeSession,
    resumePracticeSession,
} from "../../ui/app/practice-session.js";
import {
    flashcardsRoute,
    deckRouteKey,
    deckMatchesLanguage,
} from "../../ui/app/language.js";

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

test("saved deck queues restore position, all cards, and grades after Explore and browser Back", () => {
    const cards = ["one", "two", "three"].map((id) => ({ entry: { id } }));
    const session = createPracticeSession(cards);
    session.next("good");
    session.next("again");
    const snapshot = JSON.parse(JSON.stringify(session.snapshot()));
    const restored = resumePracticeSession([...cards].reverse(), snapshot);
    assert.deepEqual(
        restored.queue.map(({ entry }) => entry.id),
        ["one", "two", "three"],
    );
    assert.equal(restored.session.current.entry.id, "three");
    assert.equal(restored.session.canPrevious, true);
    restored.session.previous();
    assert.equal(restored.session.current.entry.id, "two");
    assert.equal(restored.session.answeredGrade, "again");
    restored.session.next();
    assert.equal(restored.session.current.entry.id, "three");
});

test("restoring a queue with an inaccessible card keeps grades attached to the correct surviving cards", () => {
    const cards = ["one", "two", "three"].map((id) => ({ entry: { id } }));
    const session = createPracticeSession(cards);
    session.next("good");
    session.next("again");
    const restored = resumePracticeSession(cards.slice(1), session.snapshot());
    assert.equal(restored.session.current.entry.id, "three");
    restored.session.previous();
    assert.equal(restored.session.current.entry.id, "two");
    assert.equal(restored.session.answeredGrade, "again");
});

test("deck URLs use readable language-independent names with stable identity across different accessible catalogs", () => {
    const first = {
        id: "first",
        name: "最初の単語",
        names: { en: "First Japanese Words" },
    };
    const second = { id: "second", name: "First Japanese Words" };
    assert.equal(deckRouteKey(first), "first-japanese-words--first");
    assert.equal(
        deckRouteKey(first, [first, second]),
        "first-japanese-words--first",
    );
    assert.equal(
        deckRouteKey(second, [first, second]),
        "first-japanese-words--second",
    );
});

test("assisted answers remain Again across Previous, Next and history restoration until reviewed", () => {
    const cards = ["one", "two"].map((id) => ({ entry: { id } }));
    const session = createPracticeSession(cards);
    session.next("good");
    session.answer("again");
    session.previous();
    session.next("good");
    session.answer("good");
    assert.equal(session.answeredGrade, "again");
    assert.equal(session.answered, false);
    const restored = resumePracticeSession(cards, session.snapshot());
    assert.equal(restored.session.answeredGrade, "again");
    assert.equal(restored.session.answered, false);
});

test("an in-flight answer retains its attempt identity after Explore and browser Back", () => {
    const cards = [{ entry: { id: "one" } }, { entry: { id: "two" } }];
    const session = createPracticeSession(cards);
    session.answer("good");
    const attempt = session.reviewAttempt;
    const restored = resumePracticeSession(
        cards,
        JSON.parse(JSON.stringify(session.snapshot())),
    ).session;
    assert.equal(restored.answered, false);
    assert.deepEqual(restored.reviewAttempt, attempt);
    restored.next("good");
    assert.notEqual(restored.reviewAttempt.id, attempt.id);
});

test("retry restarts the original focused queue with fresh answers and review attempts", () => {
    const cards = ["one", "two"].map((id) => ({ entry: { id } }));
    const session = createPracticeSession(cards);
    const originalAttempt = session.reviewAttempt;
    session.answer("again");
    session.next("again");
    session.answer("good");
    session.next("good");
    assert.equal(session.current, undefined);
    session.restart();
    assert.equal(session.current, cards[0]);
    assert.equal(session.canPrevious, false);
    assert.equal(session.answered, false);
    assert.equal(session.answeredGrade, undefined);
    assert.notEqual(session.reviewAttempt.id, originalAttempt.id);
    const snapshot = session.snapshot();
    assert.deepEqual(snapshot.cardIds, ["one", "two"]);
    assert.deepEqual(snapshot.grades, []);
    assert.deepEqual(snapshot.attempts, []);
    const restored = resumePracticeSession(cards, snapshot).session;
    assert.equal(restored.current, cards[0]);
    session.next();
    assert.equal(session.current, cards[1]);
    assert.equal(session.answeredGrade, undefined);
});
