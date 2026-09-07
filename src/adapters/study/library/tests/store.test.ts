import assert from "node:assert/strict";
import test from "node:test";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { LibraryStore } from "../store.js";
import type { LibraryContentPackPlan } from "../types.js";

test("content pack import recovers when another import inserts the same content", async () => {
    const commands: StructuredDbCommand[] = [];
    const schema = {
        id: "japanese",
        version: 1,
        namespace: "ja",
        language: "ja",
        metadata: { labels: { en: "Japanese" } },
        layers: [
            {
                id: "characters",
                metadata: { labels: { en: "Characters" } },
            },
        ],
    };
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (callback) => callback(db),
        executeCommand: async (command) => {
            commands.push(command);
            if (
                command.option === "SELECT" &&
                command.table === "study_library_schemas"
            ) {
                return { rows: [{ schema_json: JSON.stringify(schema) }] };
            }
            if (command.option === "SELECT") return { rows: [] };
            if (command.option === "UPDATE") {
                const attempts = commands.filter(
                    (candidate) =>
                        candidate.option === "UPDATE" &&
                        candidate.table === command.table,
                ).length;
                return { rowCount: attempts > 1 ? 1 : 0 };
            }
            if (command.conflict?.action === "ignore") return { rowCount: 0 };
            return { rowCount: 1 };
        },
    };
    const plan: LibraryContentPackPlan = {
        root: "/content",
        manifest: {
            id: "study-language-ja",
            publisher: "Cognis Labs HQ",
            version: "1.0.0",
            contentRevision: "1",
            namespace: "ja",
            schema: "schema.json",
            content: "data",
            license: { id: "CC-BY-4.0" },
        },
        schema,
        digest: "digest",
        records: [
            {
                id: "a",
                layer: "characters",
                label: "A",
                references: [
                    { entryId: "i", relation: "related", position: 0 },
                ],
            },
            { id: "i", layer: "characters", label: "I" },
        ],
        assets: [],
    };

    const receipt = await new LibraryStore(db).ingestContentPack(plan);

    assert.equal(receipt.unchanged, false);
    const entryInsert = commands.find(
        (command) =>
            command.option === "INSERT" &&
            command.table === "study_library_entries",
    );
    assert.equal(entryInsert?.option, "INSERT");
    assert.deepEqual(
        entryInsert?.option === "INSERT" ? entryInsert.conflict : undefined,
        { action: "ignore" },
    );
    const referenceCommands = commands.filter(
        (command) => command.table === "study_library_references",
    );
    assert.deepEqual(
        referenceCommands.map((command) => command.option),
        ["UPDATE", "INSERT", "UPDATE"],
    );
    const referenceInsert = referenceCommands[1];
    assert.deepEqual(
        referenceInsert.option === "INSERT"
            ? referenceInsert.conflict
            : undefined,
        { action: "ignore" },
    );
});
