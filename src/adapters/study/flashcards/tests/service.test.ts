import { Readable } from "node:stream";
import { createDeckRoutes } from "../service/routes.js";
import assert from "node:assert/strict";
import test from "node:test";
import { createCtx } from "@cognis/core";
import { DeckService, nextReview } from "../service/index.js";
import { registerDeckFlows } from "../service/flows.js";
import { DeckStore } from "../service/store.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";

function session(
    access: (
        actor: { accountId: string },
        deck: { id: string },
    ) => Promise<boolean> = async () => false,
    received: (accountId: string) => Promise<string[]> = async () => [],
    language?: string,
    recordResult?: ConstructorParameters<typeof DeckService>[8],
) {
    const records: (Record<string, unknown> & { table: string })[] = [];
    let transactionDepth = 0;
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
            if (previous && command.conflict?.action === "ignore")
                return { rowCount: 0 };
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
            transactionDepth += 1;
            try {
                return await callback(db);
            } catch (error) {
                records.splice(0, records.length, ...before);
                throw error;
            } finally {
                transactionDepth -= 1;
            }
        },
    };
    const ctx = createCtx();
    registerDeckFlows(ctx);
    let readable = true;
    let label = "Card";
    let schemaRevision = 1;
    const library = {
        listSchemas: () =>
            language
                ? [{ id: "schema", language, version: schemaRevision }]
                : [],
        read: async () => null,
        trace: async (actor: { accountId: string }, id: string) => {
            if (!readable || id !== "public") throw new Error("forbidden");
            return {
                entry: { id, label, schemaId: "schema" },
                references: [],
            };
        },
    };
    return {
        ctx,
        service: new DeckService(
            new DeckStore(db),
            () => library,
            ctx.flow,
            undefined,
            access,
            received,
            undefined,
            undefined,
            recordResult
                ? async (result, actor) => {
                      assert.equal(
                          transactionDepth,
                          0,
                          "cross-adapter results must be delivered after the schedule transaction commits",
                      );
                      await recordResult(result, actor);
                  }
                : undefined,
        ),
        setSchemaRevision: (value: number) => {
            schemaRevision = value;
        },
        setLabel: (value: string) => {
            label = value;
        },
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
    assert.equal((await service.list(learner))[0].canExport, false);
    assert.equal(
        (await service.details(learner, deckId)).deck.canExport,
        false,
    );
    assert.equal((await service.details(owner, deckId)).deck.canExport, true);
    assert.equal(
        (await service.details({ ...learner, role: "admin" }, deckId)).deck
            .canExport,
        true,
    );
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

test("deck reads and mutations execute the owning ctx stages", async () => {
    const { service, ctx } = session();
    const observed: string[] = [];
    for (const [action, stages] of Object.entries({
        list: ["authorize", "read", "audit"],
        details: ["authorize", "read", "audit"],
        save: ["authorize", "validate", "persist", "audit"],
        review: ["authorize", "validate", "persist", "audit"],
        delete: ["authorize", "persist", "audit"],
    })) {
        for (const stage of stages)
            ctx.flow.extend(
                `study:decks:${action}`,
                stage,
                { id: `test:${action}:${stage}` },
                () => {
                    observed.push(`${action}:${stage}`);
                },
            );
    }
    const deck = await service.save(owner, {
        name: "Flows",
        entryIds: ["public"],
    });
    assert.deepEqual(observed.splice(0), [
        "save:authorize",
        "save:validate",
        "save:persist",
        "save:audit",
    ]);
    await service.list(owner);
    assert.deepEqual(observed.splice(0), [
        "list:authorize",
        "list:read",
        "list:audit",
    ]);
    await service.details(owner, deck.id);
    assert.deepEqual(observed.splice(0), [
        "details:authorize",
        "details:read",
        "details:audit",
    ]);
    await service.review(owner, deck.id, "public", "good");
    assert.deepEqual(observed.splice(0), [
        "review:authorize",
        "review:validate",
        "review:persist",
        "review:audit",
    ]);
    await service.delete(owner, deck.id);
    assert.deepEqual(observed.splice(0), [
        "delete:authorize",
        "delete:persist",
        "delete:audit",
    ]);
});

test("deck language is inferred and persisted while mismatched imports are rejected", async () => {
    const { service, records } = session(undefined, undefined, "en");
    const deck = await service.save(owner, {
        name: "English",
        entryIds: ["public"],
    });
    assert.equal(deck.language, "en");
    assert.equal(
        records.find((row) => row.table === "study_decks")?.language,
        "en",
    );
    await assert.rejects(
        service.save(owner, {
            name: "Wrong",
            language: "ja",
            entryIds: ["public"],
        }),
        /deck_language_mismatch/,
    );
    assert.equal(
        records.filter((row) => row.table === "study_decks").length,
        1,
    );
});

test("shared Library cards resolve current content after edits and omit unavailable entries", async () => {
    const { service, setLabel, setReadable } = session(async () => true);
    const deck = await service.save(owner, {
        name: "Current",
        entryIds: ["public"],
    });
    setLabel("Updated meaning");
    const learner = { accountId: "learner", role: "user" };
    assert.equal(
        (await service.details(learner, deck.id)).cards[0].entry.label,
        "Updated meaning",
    );
    assert.equal(
        (await service.owned(owner.accountId, deck.id))?.cards[0].entry.label,
        "Updated meaning",
    );
    setReadable(false);
    assert.equal((await service.details(learner, deck.id)).cards.length, 0);
    assert.equal((await service.details(learner, deck.id)).unavailable, 1);
});

test("a retried answer retains its committed schedule and repairs Progress delivery outside the transaction", async () => {
    const results: Array<{ eventId?: string; occurredAt?: string }> = [];
    let fail = true;
    const { service } = session(
        undefined,
        undefined,
        undefined,
        async (result) => {
            results.push(result);
            if (fail) throw new Error("result_delivery_failed");
        },
    );
    const deck = await service.save(owner, {
        name: "Retry",
        entryIds: ["public"],
    });
    const attempt = {
        id: "stable-attempt",
        occurredAt: "2026-10-19T00:00:00.000Z",
    };
    await assert.rejects(
        service.review(owner, deck.id, "public", "good", attempt),
        /result_delivery_failed/,
    );
    assert.equal(
        (await service.details(owner, deck.id)).deck.progress.public
            .repetitions,
        1,
    );
    fail = false;
    const first = await service.review(
        owner,
        deck.id,
        "public",
        "good",
        attempt,
    );
    const repeated = await service.review(
        owner,
        deck.id,
        "public",
        "good",
        attempt,
    );
    assert.deepEqual(first.progress, repeated.progress);
    assert.equal(repeated.progress.public.repetitions, 1);
    assert.equal(results.length, 3);
    assert.equal(results[0].eventId, results[1].eventId);
    assert.equal(results[0].occurredAt, results[1].occurredAt);
    await assert.rejects(
        service.review(owner, deck.id, "public", "easy", attempt),
        /review_attempt_conflict/,
    );
    const learner = { accountId: "learner", role: "user" };
    await assert.rejects(
        service.review(learner, deck.id, "public", "good", attempt),
        /deck_not_found/,
    );
});

test("shared deck schemas follow the current Library contract rather than the saved snapshot", async () => {
    const { service, setSchemaRevision } = session(
        async () => true,
        undefined,
        "ja",
    );
    const deck = await service.save(owner, {
        name: "Schema",
        entryIds: ["public"],
    });
    setSchemaRevision(2);
    const schema = (await service.owned(owner.accountId, deck.id))
        ?.schemas[0] as { version: number };
    assert.equal(schema.version, 2);
});

test("deck metadata and details do not expose cached content after its Library access is revoked", async () => {
    const { service, setReadable, setLabel } = session();
    setLabel("Sensitive saved label");
    const deck = await service.save(owner, {
        name: "Saved",
        entryIds: ["public"],
    });
    setReadable(false);
    const listed = await service.list(owner);
    assert.deepEqual(listed[0].cards, []);
    const detail = await service.details(owner, deck.id);
    assert.deepEqual(detail.cards, []);
    assert.deepEqual(detail.deck.cards, []);
    assert.equal(
        JSON.stringify({ listed, detail }).includes("Sensitive saved label"),
        false,
    );
});

test("malformed deck languages return a client error through the actual save route", async () => {
    const { service } = session();
    const route = createDeckRoutes(service, {
        requireAuth: () => ({ sub: owner.accountId, role: owner.role }),
    } as never);
    for (const language of ["en_", "not a language"]) {
        let status = 0;
        let payload = "";
        const request = Readable.from([
            JSON.stringify({
                name: "Invalid language",
                entryIds: ["public"],
                language,
            }),
        ]);
        Object.assign(request, { method: "POST" });
        await route(
            request as never,
            {
                writeHead: (code: number) => {
                    status = code;
                },
                end: (text: string) => {
                    payload = text;
                },
            } as never,
            new URL("http://localhost/api/v1/study/decks"),
        );
        assert.equal(status, 400);
        assert.equal(JSON.parse(payload).error.code, "invalid_language");
    }
});

test("deck review rejects oversized JSON before changing a schedule", async () => {
    let reviews = 0;
    const route = createDeckRoutes(
        {
            review: async () => {
                reviews++;
            },
        } as never,
        { requireAuth: () => ({ sub: "alice", role: "user" }) } as never,
    );
    const response = {
        status: 0,
        body: "",
        writeHead(code: number) {
            this.status = code;
        },
        end(body: string) {
            this.body = body;
        },
    };
    const request = Readable.from([
        JSON.stringify({ cardId: "a".repeat(16 * 1024) }),
    ]);
    Object.assign(request, { method: "POST", headers: {} });
    await route(
        request as never,
        response as never,
        new URL("http://localhost/api/v1/study/decks/deck/review"),
    );
    assert.equal(response.status, 413);
    assert.equal(
        JSON.parse(response.body).error.code,
        "request_body_too_large",
    );
    assert.equal(reviews, 0);
});
