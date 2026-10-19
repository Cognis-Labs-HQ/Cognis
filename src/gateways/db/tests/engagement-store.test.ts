import assert from "node:assert/strict";
import test from "node:test";
import { createEngagementStore } from "../reuse/engagement-store.js";
import type { DbExecutor } from "../reuse/db-executor.js";

function database(): DbExecutor {
    const rows = new Map<string, Record<string, unknown>>();
    const executor: DbExecutor = {
        ensureTable: async (definition) => {
            assert.equal(definition.name, "engagement_participants");
        },
        transaction: async (operation) => operation(executor),
        executeCommand: async (command) => {
            assert.equal(command.table, "engagement_participants");
            if (command.option === "SELECT")
                return {
                    rows: [...rows.values()]
                        .filter((row) =>
                            (command.where ?? []).every(
                                ({ column, value }) => row[column] === value,
                            ),
                        )
                        .map((row) => structuredClone(row)),
                };
            if (command.option === "INSERT") {
                for (const value of Object.values(command.values))
                    assert.equal(
                        typeof value === "string" && value.includes("\u0000"),
                        false,
                    );
                const id = String(command.values.participant_id);
                if (rows.has(id)) return { rowCount: 0 };
                rows.set(id, structuredClone(command.values));
                return { rowCount: 1 };
            }
            if (command.option === "UPDATE") {
                const row = [...rows.values()].find((candidate) =>
                    (command.where ?? []).every(
                        ({ column, value }) => candidate[column] === value,
                    ),
                );
                if (!row) return { rowCount: 0 };
                Object.assign(row, structuredClone(command.set));
                return { rowCount: 1 };
            }
            throw new Error("unsupported_command");
        },
    };
    return executor;
}

test("the host ledger persists through recreation and enforces atomic participant revisions", async () => {
    const executor = database();
    const first = createEngagementStore(() => executor);
    const second = createEngagementStore(() => executor);
    const empty = { receipts: [], invalid: [], boosters: [] };
    await first.commit("learner", 0, empty);
    assert.deepEqual(await second.read("learner"), {
        revision: 1,
        state: empty,
    });
    await assert.rejects(
        second.commit("learner", 0, empty),
        /engagement_state_conflict/,
    );
    await first.commit("learner", 1, {
        receipts: [],
        invalid: ["drawing-one"],
        boosters: [],
    });
    await assert.rejects(
        second.commit("learner", 1, empty),
        /engagement_state_conflict/,
    );
    assert.deepEqual(await second.read("learner"), {
        revision: 2,
        state: { receipts: [], invalid: ["drawing-one"], boosters: [] },
    });
    assert.deepEqual(await second.read("another"), {
        revision: 0,
        state: empty,
    });
});

test("reward snapshots round-trip beyond a normal SQL TEXT field", async () => {
    const executor = database();
    const store = createEngagementStore(() => executor);
    const state = {
        receipts: [],
        boosters: [],
        invalid: Array.from(
            { length: 5000 },
            (_, index) => `activity-identifier-${index}`,
        ),
    };
    assert.ok(Buffer.byteLength(JSON.stringify(state)) > 65535);
    await store.commit("learner", 0, state);
    assert.deepEqual((await store.read("learner")).state, state);
});
