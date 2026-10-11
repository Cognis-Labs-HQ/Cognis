import assert from "node:assert/strict";
import test from "node:test";
import { createCtx } from "@cognis/core";
import { DeckService, nextReview } from "../service/service.js";
import { DeckStore } from "../service/store.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";

function session(
    access: (
        actor: { accountId: string },
        deck: { id: string },
    ) => Promise<boolean> = async () => false,
    received: (accountId: string) => Promise<string[]> = async () => [],
) {
    const records: (Record<string, unknown> & { table: string })[] = [];
    const execute = async (command: StructuredDbCommand) => {
        const matching = (row: Record<string, unknown>) =>
            row.table === command.table &&
            (!("where" in command) ||
                (command.where ?? []).every(
                    (condition) => row[condition.column] === condition.value,
                ));
        if (command.option === "SELECT")
            return {
                rows: records
                    .filter(matching)
                    .map((row) => structuredClone(row)),
            };
        if (command.option === "INSERT") {
            const previous =
                "conflict" in command
                    ? records.find(
                          (row) =>
                              row.table === command.table &&
                              command.conflict?.target?.every(
                                  (key) => row[key] === command.values[key],
                              ),
                      )
                    : undefined;
            if (previous && "conflict" in command)
                Object.assign(previous, command.conflict?.update);
            else
                records.push({
                    ...structuredClone(command.values),
                    table: command.table,
                });
        }
        if (command.option === "UPDATE")
            records
                .filter(matching)
                .forEach((row) =>
                    Object.assign(row, structuredClone(command.set)),
                );
        if (command.option === "DELETE")
            for (let index = records.length - 1; index >= 0; index--)
                if (matching(records[index])) records.splice(index, 1);
        return { rowCount: 1 };
    };
    const db: DbExecutor = {
        ensureTable: async () => {},
        executeCommand: execute,
        transaction: async (callback) => {
            const before = structuredClone(records);
            try {
                return await callback(db);
            } catch (error) {
                records.splice(0, records.length, ...before);
                throw error;
            }
        },
    };
    const ctx = createCtx();
    for (const [id, stages] of Object.entries({
        save: ["authorize", "validate", "persist", "audit"],
        review: ["authorize", "validate", "persist", "audit"],
        delete: ["authorize", "persist", "audit"],
    }))
        ctx.registerFlow({ id: `study:decks:${id}`, stages });
    let readable = true;
    const library = {
        read: async () => null,
        trace: async (actor: { accountId: string }, id: string) => {
            if (!readable || id !== "public") throw new Error("forbidden");
            return { entry: { id, label: "Card" }, references: [] };
        },
    };
    return {
        service: new DeckService(
            new DeckStore(db),
            () => library,
            ctx.flow,
            undefined,
            access,
            received,
        ),
        setReadable: (value: boolean) => {
            readable = value;
        },
        records,
    };
}
const owner = { accountId: "owner", role: "user" };

test("decks persist privately and users cannot edit or review another account's deck", async () => {
    const { service } = session();
    const deck = await service.save(owner, {
        name: "My deck",
        entryIds: ["public"],
    });
    assert.equal((await service.list(owner)).length, 1);
    const other = { accountId: "other", role: "admin" };
    assert.deepEqual(await service.list(other), []);
    await assert.rejects(
        () =>
            service.save(
                other,
                { name: "Other", entryIds: ["public"] },
                deck.id,
            ),
        /deck_not_found/,
    );
    await assert.rejects(
        () => service.review(other, deck.id, "public", "good"),
        /deck_not_found/,
    );
});

test("review persistence retains other progress and imported note identities", async () => {
    const { service } = session();
    const deck = await service.save(owner, {
        name: "Deck",
        entryIds: ["public"],
        notes: [{ front: "Question", back: "Answer" }],
    });
    const reviewed = await service.review(owner, deck.id, "public", "good");
    assert.equal(reviewed.progress.public.interval, 1);
    const saved = await service.save(
        owner,
        { name: "Renamed", entryIds: ["public"], notes: deck.notes },
        deck.id,
    );
    assert.equal(saved.notes[0].id, deck.notes[0].id);
    assert.equal(saved.progress.public.interval, 1);
    await assert.rejects(
        () => service.review(owner, deck.id, "unlisted", "easy"),
        /invalid_deck_card/,
    );
});

test("relocated or deleted library cards are skipped when they become inaccessible", async () => {
    const { service, setReadable } = session();
    const deck = await service.save(owner, {
        name: "Deck",
        entryIds: ["public"],
    });
    setReadable(false);
    const detail = await service.details(owner, deck.id);
    assert.equal(detail.unavailable, 1);
    assert.deepEqual(detail.cards, []);
    await assert.rejects(
        () => service.review(owner, deck.id, "public", "good"),
        /deck_card_unavailable/,
    );
});

test("recall grades schedule one-minute retries, daily reviews, and longer easy intervals", () => {
    const now = new Date("2026-10-11T00:00:00Z");
    assert.equal(
        nextReview(undefined, "again", now).due,
        "2026-10-11T00:01:00.000Z",
    );
    assert.equal(
        nextReview(undefined, "good", now).due,
        "2026-10-12T00:00:00.000Z",
    );
    assert.equal(nextReview(undefined, "easy", now).interval, 4);
    assert.throws(
        () => nextReview(undefined, "unknown", now),
        /invalid_review_grade/,
    );
});

test("shared decks isolate learner schedules and revocation takes effect immediately", async () => {
    let granted = true;
    let deckId = "";
    const { service } = session(
        async (actor) => granted && actor.accountId === "learner",
        async (accountId) => (accountId === "learner" ? [deckId] : []),
    );
    const deck = await service.save(owner, {
        name: "Shared",
        entryIds: ["public"],
    });
    deckId = deck.id;
    const learner = { accountId: "learner", role: "user" };
    assert.equal((await service.list(learner))[0].canEdit, false);
    await service.review(learner, deckId, "public", "easy");
    assert.equal(
        (await service.details(learner, deckId)).deck.progress.public.interval,
        4,
    );
    assert.deepEqual((await service.details(owner, deckId)).deck.progress, {});
    await assert.rejects(
        () =>
            service.save(
                learner,
                { name: "Hijacked", entryIds: ["public"] },
                deckId,
            ),
        /deck_not_found/,
    );
    await assert.rejects(
        () => service.delete(learner, deckId),
        /deck_not_found/,
    );
    granted = false;
    assert.deepEqual(await service.list(learner), []);
    await assert.rejects(
        () => service.details(learner, deckId),
        /deck_not_found/,
    );
    await assert.rejects(
        () => service.review(learner, deckId, "public", "again"),
        /deck_not_found/,
    );
});

test("link guests cannot persist personal decks or learner review history", async () => {
    const { service } = session();
    const guest = { accountId: "share:link:session", role: "user" };
    await assert.rejects(
        () => service.save(guest, { name: "Guest", entryIds: ["public"] }),
        /deck_read_only/,
    );
    await assert.rejects(
        () => service.review(guest, "deck", "public", "good"),
        /deck_read_only/,
    );
});
