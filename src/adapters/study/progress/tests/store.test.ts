import assert from "node:assert/strict";
import test from "node:test";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { DbProgressStore } from "../store.js";
import type { LearningEvent, ProgressProjection } from "../types.js";

function persistentExecutor(): DbExecutor {
    const tables = new Map<string, Array<Record<string, unknown>>>();
    const executor: DbExecutor = {
        ensureTable: async (definition) => {
            if (!tables.has(definition.name)) tables.set(definition.name, []);
        },
        transaction: async (callback) => callback(executor),
        executeCommand: async (command: StructuredDbCommand) => {
            const rows = tables.get(command.table) ?? [];
            if (command.option === "SELECT") {
                const selected = rows.filter((row) =>
                    (command.where ?? []).every(
                        (clause) => row[clause.column] === clause.value,
                    ),
                );
                return { rows: structuredClone(selected) };
            }
            if (command.option === "INSERT") {
                if (
                    command.conflict?.action === "ignore" &&
                    rows.some((row) => row.event_id === command.values.event_id)
                ) {
                    return { rowCount: 0 };
                }
                rows.push(structuredClone(command.values));
                tables.set(command.table, rows);
                return { rowCount: 1 };
            }
            if (command.option === "DELETE") {
                tables.set(command.table, []);
                return { rowCount: rows.length };
            }
            return { rowCount: 0 };
        },
    };
    return executor;
}

function learningEvent(durationMs = 800): LearningEvent {
    return {
        id: "persistent-event",
        actorId: "actor-one",
        occurredAt: "2026-09-06T10:00:00.000Z",
        content: {
            schema: "language-v1",
            layer: "words",
            language: "ja",
            contentId: "word-one",
        },
        contentRevision: "revision-one",
        activity: "recall",
        context: {},
        attempt: 1,
        correct: true,
        independentCorrect: true,
        hints: 0,
        durationMs,
        completion: "completed",
        metadata: {},
    };
}

test("DB progress survives store recreation and enforces idempotency", async () => {
    const databaseExecutor = persistentExecutor();
    const firstStore = new DbProgressStore(databaseExecutor);
    await firstStore.ensureSchema();
    assert.equal(await firstStore.append(learningEvent()), "inserted");

    const restoredStore = new DbProgressStore(databaseExecutor);
    assert.deepEqual(await restoredStore.all(), [learningEvent()]);
    assert.equal(await restoredStore.append(learningEvent()), "duplicate");
    await assert.rejects(
        restoredStore.append(learningEvent(900)),
        /event_id_conflict/,
    );
});

test("DB progress atomically replaces rebuildable projections", async () => {
    const databaseExecutor = persistentExecutor();
    const store = new DbProgressStore(databaseExecutor);
    await store.ensureSchema();
    const projection: ProgressProjection = {
        actorId: "actor-one",
        content: learningEvent().content,
        contentRevision: "revision-one",
        seen: 1,
        attempted: 1,
        correct: 1,
        mastered: false,
        dueForReview: "2026-09-08T10:00:00.000Z",
        confidence: 1,
        streak: 1,
        hintDependence: 0,
        lastPractice: "2026-09-06T10:00:00.000Z",
        responseDurationMs: 800,
    };
    await store.replaceProjections([projection]);
    assert.deepEqual(await store.projections(), [projection]);
});
