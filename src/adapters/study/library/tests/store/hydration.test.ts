import assert from "node:assert/strict";
import test from "node:test";
import { LibraryStore } from "../../store.js";
import type { DbExecutor } from "../../../../../gateways/db/reuse/db-executor.js";

test("listing cards hydrates ordered and grouped references with one batch per edge kind", async () => {
    const commands: object[] = [];
    const database: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (operation) => operation(database),
        executeCommand: async (command) => {
            commands.push(command);
            if (command.table === "study_library_entries")
                return {
                    rows: Array.from({ length: 100 }, (_, index) => ({
                        id: `card-${index}`,
                        fields_json: "{}",
                        tags_json: "[]",
                    })),
                };
            return {
                rows: [
                    {
                        source_entry_id: "card-0",
                        target_entry_id: "first",
                        relation: "reading",
                        group_index: 0,
                        position: 0,
                    },
                    {
                        source_entry_id: "card-0",
                        target_entry_id: "second",
                        relation: "reading",
                        group_index: 0,
                        position: 1,
                    },
                    {
                        source_entry_id: "card-1",
                        target_entry_id: "word",
                        relation: "spelling",
                        group_index: -1,
                        position: 0,
                        transformation_json: '{"form":"polite"}',
                    },
                ].filter(
                    (row) =>
                        row.group_index >= 0 ===
                        (command.table === "study_library_reference_groups"),
                ),
            };
        },
    };
    const entries = await new LibraryStore(database).list({
        scope: "global",
        scopeId: "global",
    });
    assert.equal(commands.length, 3);
    assert.equal(entries.length, 100);
    assert.deepEqual(
        entries[0].referenceGroups?.reading[0].map((value) => value.entryId),
        ["first", "second"],
    );
    assert.deepEqual(entries[1].references[0].transformation, {
        form: "polite",
    });
    await new LibraryStore(database).list(
        { scope: "global", scopeId: "global" },
        { entryIds: ["card-0", "card-1"] },
    );
    assert.deepEqual((commands[3] as { where: object[] }).where.at(-1), {
        column: "id",
        operator: "IN",
        value: ["card-0", "card-1"],
    });
});

test("saving dictionary results removes expired cache rows before upserting", async () => {
    const commands: object[] = [];
    const database: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (operation) => operation(database),
        executeCommand: async (command) => {
            commands.push(command);
            return { rows: [] };
        },
    };
    await new LibraryStore(database).saveDictionaryCache("query", {
        value: [],
        probedAt: Date.now(),
        publishedAt: Date.now(),
        expiresAt: Date.now() + 86400000,
    });
    const cleanup = commands[0] as {
        option: string;
        table: string;
        where: { column: string; operator: string; value: string }[];
    };
    assert.equal(cleanup.option, "DELETE");
    assert.equal(cleanup.table, "study_library_dictionary_cache");
    assert.equal(cleanup.where[0].column, "expires_at");
    assert.equal(cleanup.where[0].operator, "<=");
    assert.ok(Number.isFinite(Date.parse(cleanup.where[0].value)));
});
