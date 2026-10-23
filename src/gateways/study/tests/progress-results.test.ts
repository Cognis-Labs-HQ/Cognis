import assert from "node:assert/strict";
import test from "node:test";
import { recordStudyResult } from "../progress.js";
import type { LearningEventInput } from "../reuse/progress.js";

function fixture() {
    const events: LearningEventInput[] = [];
    const readers: string[] = [];
    let available = true;
    let classroom: string | undefined;
    let classMember = true;
    const ports = new Map<string, unknown>([
        [
            "study:classes:access",
            { canRead: async () => classMember, canWrite: async () => false },
        ],
        [
            "study:library",
            {
                read: async (actor: { accountId: string }, id: string) => {
                    readers.push(actor.accountId);
                    return available
                        ? {
                              id,
                              schemaId: "japanese",
                              layer: "kana",
                              language: "ja",
                              fields: { pronunciation: ["a"] },
                              scope: classroom ? "class" : "global",
                              scopeId: classroom ?? "global",
                          }
                        : null;
                },
            },
        ],
        [
            "study:progress",
            {
                recordPractice: async (
                    actor: { accountId: string },
                    event: LearningEventInput,
                ) => {
                    assert.equal(actor.accountId, "learner");
                    events.push(event);
                },
            },
        ],
    ]);
    return {
        events,
        readers,
        ports: {
            require<T>(id: string): T {
                if (!ports.has(id)) throw new Error("capability_unavailable");
                return ports.get(id) as T;
            },
        },
        setClassMember: (member: boolean) => {
            classMember = member;
        },
        setClassroom: (id: string) => {
            classroom = id;
        },
        disableLibrary: () => {
            available = false;
        },
        disableProgress: () => {
            ports.delete("study:progress");
        },
    };
}

const actor = { accountId: "learner", role: "user" as const };
const result = {
    accountId: "learner",
    entryId: "kana-a",
    activity: "drawing" as const,
    correct: true,
};

test("drawing and flashcard results preserve canonical identity and assistance in Progress", async () => {
    const state = fixture();
    await recordStudyResult(state.ports, actor, result);
    await recordStudyResult(state.ports, actor, {
        ...result,
        activity: "flashcards",
        correct: false,
        deckId: "deck",
    });
    await recordStudyResult(state.ports, actor, {
        ...result,
        assisted: true,
        mistakes: 2,
    });
    assert.deepEqual(state.events[0].content, {
        schema: "japanese",
        layer: "kana",
        language: "ja",
        contentId: "kana-a",
    });
    assert.equal(state.events[0].independentCorrect, true);
    assert.equal(state.events[1].activity, "flashcards");
    assert.equal(state.events[1].correct, false);
    assert.equal(state.events[1].metadata?.deckId, "deck");
    assert.equal(state.events[2].independentCorrect, false);
    assert.equal(state.events[2].hints, 1);
    assert.equal(state.events[2].metadata?.mistakes, 2);
    assert.match(state.events[0].contentRevision, /^[a-f0-9]{64}$/);
});

test("result recording rejects guest actors, mismatched accounts, unavailable content and disabled Progress", async () => {
    const state = fixture();
    await assert.rejects(
        recordStudyResult(
            state.ports,
            { ...actor, accountId: "share:guest" },
            result,
        ),
        /forbidden/,
    );
    await assert.rejects(
        recordStudyResult(state.ports, actor, {
            ...result,
            accountId: "other",
        }),
        /forbidden/,
    );
    state.disableLibrary();
    await assert.rejects(
        recordStudyResult(state.ports, actor, result),
        /not_found/,
    );
    const disabled = fixture();
    disabled.disableProgress();
    await assert.rejects(
        recordStudyResult(disabled.ports, actor, result),
        /capability_unavailable/,
    );
    assert.equal(state.events.length, 0);
});

test("authorized shared decks resolve content as their owner but record the learner; imported notes retain their own identity", async () => {
    const state = fixture();
    await recordStudyResult(state.ports, actor, {
        ...result,
        readerAccountId: "owner",
    });
    assert.deepEqual(state.readers, ["owner"]);
    await recordStudyResult(state.ports, actor, {
        ...result,
        entryId: "note",
        activity: "flashcards",
        importedNote: { id: "note", language: "en", revision: "revision" },
    });
    assert.deepEqual(state.events[1].content, {
        schema: "study-flashcards",
        layer: "imported-notes",
        language: "en",
        contentId: "note",
    });
    assert.equal(state.events[1].contentRevision, "revision");
});

test("authorized classroom practice retains scope while a deck share does not grant classroom membership", async () => {
    const state = fixture();
    state.setClassroom("classroom");
    await recordStudyResult(state.ports, actor, result);
    assert.deepEqual(state.events[0].context, { classroomId: "classroom" });
    await recordStudyResult(state.ports, actor, {
        ...result,
        readerAccountId: "teacher",
    });
    assert.deepEqual(state.events[1].context, { classroomId: "classroom" });
    state.setClassMember(false);
    await recordStudyResult(state.ports, actor, {
        ...result,
        readerAccountId: "teacher",
    });
    assert.deepEqual(state.events[2].context, {});
});
