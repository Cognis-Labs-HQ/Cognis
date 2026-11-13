import assert from "node:assert/strict";
import test from "node:test";
import { LibraryStore } from "../../store.js";
import type { DbExecutor } from "../../../../../gateways/db/reuse/db-executor.js";

test("request decisions and card moves share one transaction and roll back together", async () => {
    let state = { status: "pending", scope: "user" };
    let transactions = 0;
    const database: DbExecutor = {
        ensureTable: async () => {},
        executeCommand: async (command) => {
            if (
                command.option === "UPDATE" &&
                command.table === "study_library_push_requests"
            ) {
                if (state.status !== "pending") return { rowCount: 0 };
                state.status = String(command.set.status);
            }
            if (
                command.option === "UPDATE" &&
                command.table === "study_library_entries"
            )
                state.scope = String(command.set.scope);
            return { rowCount: 1, rows: [] };
        },
        transaction: async (operation) => {
            transactions += 1;
            const snapshot = { ...state };
            try {
                return await operation(database);
            } catch (error) {
                state = snapshot;
                throw error;
            }
        },
    };
    const store = new LibraryStore(database);
    await assert.rejects(
        store.transaction(async () => {
            await store.reviewPush("request", "approved", "admin");
            await store.move("card", { scope: "global", scopeId: "global" });
            await store.transaction(async () => {
                throw new Error("validation_failed");
            });
        }),
        /validation_failed/,
    );
    assert.deepEqual(state, { status: "pending", scope: "user" });
    assert.equal(transactions, 1);
    await store.transaction(async () => {
        await store.reviewPush("request", "approved", "admin");
        await store.move("card", { scope: "global", scopeId: "global" });
    });
    assert.deepEqual(state, { status: "approved", scope: "global" });
    await assert.rejects(
        store.transaction(() =>
            store.reviewPush("request", "rejected", "admin"),
        ),
        /already_reviewed/,
    );
    assert.equal(state.status, "approved");
});
