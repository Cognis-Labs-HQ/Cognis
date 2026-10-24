import assert from "node:assert/strict";
import test from "node:test";
import { DeckStore } from "../service/store.js";
import { structuredStore } from "../../../../gateways/reuse/tests/structured-store.js";

function progress(count: number) {
    return Object.fromEntries(
        Array.from({ length: count }, (_, index) => [
            `card-${index}`,
            {
                due: "2026-10-20T12:00:00.000Z",
                interval: index,
                repetitions: 2,
            },
        ]),
    );
}

test("large membership and learner schedules round-trip independently with atomic rollback and cleanup", async () => {
    const fixture = structuredStore();
    const store = new DeckStore(fixture.db);
    await store.initialize();
    const entryIds = Array.from(
        { length: 5000 },
        (_, index) => `canonical-library-card-${index}`,
    );
    const deck = await store.transact((transaction) =>
        transaction.save("owner", { name: "Large", entryIds, notes: [] }),
    );
    const ownerProgress = progress(3000);
    const otherProgress = progress(2000);
    await Promise.all([
        store.transact((transaction) =>
            transaction.saveProgress("owner", deck.id, ownerProgress),
        ),
        store.transact((transaction) =>
            transaction.saveProgress("learner", deck.id, otherProgress),
        ),
    ]);
    const restarted = new DeckStore(fixture.db);
    await restarted.initialize();
    assert.deepEqual((await restarted.list("owner"))[0].entryIds, entryIds);
    assert.deepEqual(await restarted.progress("owner", deck.id), ownerProgress);
    assert.deepEqual(
        await restarted.progress("learner", deck.id),
        otherProgress,
    );
    fixture.fail(
        (command) =>
            command.option === "INSERT" &&
            command.table === "study_deck_document_parts" &&
            command.values.position === 2,
    );
    await assert.rejects(
        store.transact(async (transaction) => {
            await transaction.reserveReview(
                "owner",
                deck.id,
                "pending-answer",
                entryIds[0],
                "good",
            );
            await transaction.saveProgress("owner", deck.id, progress(4000));
        }),
        /storage_failed/,
    );
    assert.deepEqual(await restarted.progress("owner", deck.id), ownerProgress);
    fixture.fail(() => false);
    await store.transact(async (transaction) => {
        assert.equal(
            await transaction.reserveReview(
                "owner",
                deck.id,
                "pending-answer",
                entryIds[0],
                "good",
            ),
            true,
        );
        await transaction.saveProgress("owner", deck.id, progress(1));
    });
    assert.deepEqual(await restarted.progress("owner", deck.id), progress(1));
    assert.deepEqual(
        await restarted.progress("learner", deck.id),
        otherProgress,
    );
    await assert.rejects(
        store.transact((transaction) =>
            transaction.delete("stranger", deck.id),
        ),
        /deck_not_found/,
    );
    assert.equal((await restarted.find(deck.id))?.id, deck.id);
    await store.transact((transaction) => transaction.delete("owner", deck.id));
    assert.deepEqual(await restarted.list("owner"), []);
    assert.deepEqual(fixture.rows("study_deck_document_parts"), []);
    assert.deepEqual(await restarted.progress("learner", deck.id), {});
});
