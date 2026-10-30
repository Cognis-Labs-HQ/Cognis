import { createHash } from "node:crypto";
import type { StudyAttempt } from "../../../../gateways/study/reuse/attempt.js";
import type { StudyResult } from "../../../../gateways/study/progress.js";
import type { DeckActor, StudyDeck } from "./types.js";

export function reviewResult(
    actor: DeckActor,
    deck: StudyDeck,
    cardId: string,
    grade: unknown,
    attempt: StudyAttempt,
): StudyResult {
    const note = deck.notes.find(({ id }) => id === cardId);
    return {
        accountId: actor.accountId,
        entryId: cardId,
        activity: "flashcards",
        eventId:
            "flashcards-" +
            createHash("sha256")
                .update(JSON.stringify([actor.accountId, deck.id, attempt.id]))
                .digest("hex"),
        occurredAt: attempt.occurredAt,
        correct: grade !== "again",
        deckId: deck.id,
        readerAccountId: deck.provider ? actor.accountId : deck.ownerAccountId,
        ...(note
            ? {
                  importedNote: {
                      id: note.id,
                      language: deck.language ?? "und",
                      revision: createHash("sha256")
                          .update(JSON.stringify(note))
                          .digest("hex"),
                  },
              }
            : {}),
    };
}
