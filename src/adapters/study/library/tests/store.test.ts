import assert from "node:assert/strict";
import test from "node:test";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { LibraryStore } from "../store.js";
import type { LibraryContentPackPlan } from "../types.js";

test("content pack import ignores duplicate all-key references", async () => {
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
    const entryInsert = commands.find(
        (command) =>
            command.option === "INSERT" &&
            command.table === "study_library_entries",
    );
    assert.equal(entryInsert?.option, "INSERT");
    assert.equal(
        entryInsert?.option === "INSERT"
            ? entryInsert.values.source_record_id
            : undefined,
        "a",
    );
    assert.deepEqual(
        entryInsert?.option === "INSERT"
            ? entryInsert.conflict?.target
            : undefined,
        ["id"],
    );
    const referenceInsert = commands.find(
        (command) =>
            command.option === "INSERT" &&
            command.table === "study_library_references",
    );
    assert.deepEqual(
        referenceInsert.option === "INSERT"
            ? referenceInsert.conflict
            : undefined,
        { action: "ignore" },
    );
});

test("content pack import removes duplicate hashes and preserves references", async () => {
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
            if (command.option !== "SELECT") return { rowCount: 1 };
            if (command.table === "study_library_content_packs") {
                return { rows: [] };
            }
            if (command.table === "study_library_schemas") {
                return { rows: [{ schema_json: JSON.stringify(schema) }] };
            }
            if (command.table === "study_library_entries") {
                return { rows: [{ id: "old-one" }, { id: "old-two" }] };
            }
            if (
                command.table === "study_library_references" &&
                command.where?.[0]?.column === "target_entry_id"
            ) {
                return {
                    rows: [
                        {
                            source_entry_id: "external",
                            target_entry_id: command.where[0].value,
                            relation: "related",
                            position: 0,
                        },
                    ],
                };
            }
            return { rows: [] };
        },
    };
    const plan: LibraryContentPackPlan = {
        root: "/content",
        manifest: {
            id: "study-language-ja",
            publisher: "Cognis Labs HQ",
            version: "2.0.0",
            contentRevision: "2",
            namespace: "ja",
            schema: "schema.json",
            content: "data",
            license: { id: "CC-BY-4.0" },
        },
        schema,
        digest: "digest-two",
        records: [
            { id: "ja:a", layer: "characters", label: "あ" },
            { id: "ja:a-copy", layer: "characters", label: "あ" },
        ],
        assets: [],
    };

    await new LibraryStore(db).ingestContentPack(plan);

    const deletedEntryIds = commands
        .filter(
            (command) =>
                command.option === "DELETE" &&
                command.table === "study_library_entries",
        )
        .map((command) => command.where?.[0]?.value);
    assert.deepEqual(new Set(deletedEntryIds), new Set(["old-one", "old-two"]));
    assert.equal(
        commands.some(
            (command) =>
                command.option === "INSERT" &&
                command.table === "study_library_references" &&
                command.values.target_entry_id !== "old-one" &&
                command.values.target_entry_id !== "old-two",
        ),
        true,
    );
    const importedEntryIds = new Set(
        commands
            .filter(
                (command) =>
                    command.option === "INSERT" &&
                    command.table === "study_library_entries",
            )
            .map((command) =>
                command.option === "INSERT" ? command.values.id : undefined,
            ),
    );
    assert.equal(importedEntryIds.size, 1);
});

test("permanent deletion blacklists content hashes and removes relationships", async () => {
    const commands: StructuredDbCommand[] = [];
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (callback) => callback(db),
        executeCommand: async (command) => {
            commands.push(command);
            if (
                command.option === "SELECT" &&
                command.table === "study_library_entries"
            ) {
                return { rows: [{ content_hash: "hash-one" }] };
            }
            return { rowCount: 1 };
        },
    };

    await new LibraryStore(db).deleteEntries(["entry-one"], "admin", true);

    assert.equal(
        commands.some(
            (command) =>
                command.option === "INSERT" &&
                command.table === "study_library_content_hash_blacklist" &&
                command.values.content_hash === "hash-one" &&
                command.values.deleted_by === "admin",
        ),
        true,
    );
    assert.equal(
        commands.filter(
            (command) =>
                command.option === "DELETE" &&
                command.table === "study_library_references",
        ).length,
        2,
    );
    assert.equal(
        commands.some(
            (command) =>
                command.option === "DELETE" &&
                command.table === "study_library_entries",
        ),
        true,
    );
});

test("content pack reconciliation skips blacklisted hashes", async () => {
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
        records: [{ id: "a", layer: "characters", label: "A" }],
        assets: [],
    };
    const hash = (await import("../content-pack.js")).contentRecordHash(
        plan.manifest,
        plan.schema,
        plan.records[0],
    );
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (callback) => callback(db),
        executeCommand: async (command) => {
            commands.push(command);
            if (command.option !== "SELECT") return { rowCount: 1 };
            if (command.table === "study_library_content_hash_blacklist")
                return { rows: [{ content_hash: hash }] };
            if (command.table === "study_library_schemas")
                return { rows: [{ schema_json: JSON.stringify(schema) }] };
            return { rows: [] };
        },
    };

    await new LibraryStore(db).ingestContentPack(plan);

    assert.equal(
        commands.some(
            (command) =>
                command.option === "INSERT" &&
                command.table === "study_library_entries",
        ),
        false,
    );
});

test("unchanged content packs restore entries removed after installation", async () => {
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
        digest: "installed-digest",
        records: [{ id: "a", layer: "characters", label: "A" }],
        assets: [],
    };
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (callback) => callback(db),
        executeCommand: async (command) => {
            commands.push(command);
            if (command.option !== "SELECT") return { rowCount: 1 };
            if (command.table === "study_library_content_packs") {
                if (command.columns?.includes("version")) return { rows: [] };
                return { rows: [{ digest: "installed-digest" }] };
            }
            if (command.table === "study_library_schemas") {
                return { rows: [{ schema_json: JSON.stringify(schema) }] };
            }
            return { rows: [] };
        },
    };

    const receipt = await new LibraryStore(db).ingestContentPack(plan);
    const restoredEntries = commands.filter(
        (command) =>
            command.option === "INSERT" &&
            command.table === "study_library_entries",
    );

    assert.equal(receipt.unchanged, true);
    assert.equal(restoredEntries.length, 1);
});
