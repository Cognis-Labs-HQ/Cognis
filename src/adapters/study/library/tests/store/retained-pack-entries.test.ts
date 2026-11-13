import assert from "node:assert/strict";
import test from "node:test";
import type { DbExecutor } from "../../../../../gateways/db/reuse/db-executor.js";
import { retainedPackEntries } from "../../store/retained-pack-entries.js";

test("pack pruning retains recursive dependencies of user cards and provider edits but releases replaced provider-only edges", async () => {
    const edges = [
        ["user-card", "old-word"],
        ["old-word", "old-character"],
        ["old-character", "old-word"],
        ["modified", "old-reading"],
        ["replaced", "obsolete"],
    ];
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (operation) => operation(db),
        executeCommand: async (command) => {
            assert.ok(
                [
                    "study_library_references",
                    "study_library_reference_groups",
                ].includes(command.table),
            );
            if (command.table === "study_library_reference_groups")
                return { rows: [] };
            return {
                rows: edges.map(([source_entry_id, target_entry_id]) => ({
                    source_entry_id,
                    target_entry_id,
                })),
            };
        },
    };
    const retained = await retainedPackEntries(
        db,
        new Set([
            "modified",
            "replaced",
            "old-word",
            "old-character",
            "old-reading",
            "obsolete",
        ]),
        new Set(["replaced"]),
        new Set(["modified"]),
    );
    assert.deepEqual([...retained].sort(), [
        "modified",
        "old-character",
        "old-reading",
        "old-word",
    ]);
});
