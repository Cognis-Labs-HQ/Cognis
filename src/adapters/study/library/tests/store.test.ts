import assert from "node:assert/strict";
import test from "node:test";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { LibraryStore } from "../store.js";
import type { LibraryContentPackPlan } from "../types.js";

test("content pack import atomically updates duplicate records and references", async () => {
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
    const entryCommand = commands.find(
        (command) => command.table === "study_library_entries",
    );
    assert.equal(entryCommand?.option, "INSERT");
    assert.deepEqual(
        entryCommand?.option === "INSERT" ? entryCommand.conflict?.target : [],
        ["id"],
    );
    assert.equal(
        entryCommand?.option === "INSERT"
            ? entryCommand.conflict?.action
            : undefined,
        "update",
    );
    const referenceCommand = commands.find(
        (command) => command.table === "study_library_references",
    );
    assert.equal(referenceCommand?.option, "INSERT");
    assert.deepEqual(
        referenceCommand?.option === "INSERT"
            ? referenceCommand.conflict?.target
            : [],
        ["source_entry_id", "target_entry_id", "relation", "position"],
    );
    assert.equal(
        referenceCommand?.option === "INSERT"
            ? referenceCommand.conflict?.action
            : undefined,
        "update",
    );
});
