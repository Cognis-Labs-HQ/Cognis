import assert from "node:assert/strict";
import test from "node:test";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { LibraryStore } from "../store.js";
import { contentEntryId } from "../content-pack.js";
import type { LibraryContentPackPlan } from "../types.js";

test("new releases may replace a schema owned only by the same content pack", async () => {
    const commands: StructuredDbCommand[] = [];
    const previousSchema = {
        id: "japanese",
        version: 45,
        namespace: "ja",
        language: "ja",
        metadata: { labels: { en: "Japanese" } },
        layers: [{ id: "words", metadata: { labels: { en: "Words" } } }],
    };
    const nextSchema = {
        ...previousSchema,
        layers: [
            {
                ...previousSchema.layers[0],
                displayDefinition: true,
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
                return {
                    rows: [{ schema_json: JSON.stringify(previousSchema) }],
                };
            }
            if (
                command.option === "SELECT" &&
                command.table === "study_library_content_packs" &&
                command.where?.some(({ column }) => column === "schema_id")
            ) {
                return {
                    rows: [
                        { publisher: "Cognis Labs HQ", pack_id: "japanese" },
                    ],
                };
            }
            if (command.option === "SELECT") return { rows: [] };
            return { rowCount: 1 };
        },
    };
    await new LibraryStore(db).ingestContentPack({
        root: "/content",
        manifest: {
            id: "japanese",
            publisher: "Cognis Labs HQ",
            version: "2.2.16",
            contentRevision: "12",
            namespace: "ja",
            schema: "schema.json",
            content: "content",
            license: { id: "AGPL-3.0-or-later" },
        },
        schema: nextSchema,
        digest: "next",
        records: [],
        assets: [],
    });
    assert.ok(
        commands.some(
            (command) =>
                command.option === "UPDATE" &&
                command.table === "study_library_schemas" &&
                command.set.schema_json === JSON.stringify(nextSchema),
        ),
    );
});

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
            metadata: { catalog: { featured: true } },
            license: { id: "CC-BY-4.0" },
        },
        schema,
        digest: "digest",
        records: [
            {
                id: "a",
                layer: "characters",
                label: "A",
                hidden: true,
                references: [
                    { entryId: "i", relation: "related", position: 0 },
                ],
            },
            { id: "i", layer: "characters", label: "I" },
            {
                id: "self",
                layer: "characters",
                label: "Self",
                references: [
                    { entryId: "self", relation: "related", position: 0 },
                ],
            },
        ],
        assets: [],
    };

    const receipt = await new LibraryStore(db).ingestContentPack(plan);

    assert.equal(receipt.unchanged, false);
    assert.equal(receipt.newRecordCount, 3);
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
    assert.equal(
        entryInsert?.option === "INSERT"
            ? entryInsert.values.hidden
            : undefined,
        true,
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
    const referenceDeleteIndex = commands.findIndex(
        (command) =>
            command.option === "DELETE" &&
            command.table === "study_library_references",
    );
    const referenceInsertIndex = commands.findIndex(
        (command) =>
            command.option === "INSERT" &&
            command.table === "study_library_references",
    );
    assert.ok(referenceDeleteIndex >= 0);
    assert.ok(referenceDeleteIndex < referenceInsertIndex);
    assert.deepEqual(
        referenceInsert.option === "INSERT"
            ? referenceInsert.conflict
            : undefined,
        { action: "ignore" },
    );
    assert.equal(
        commands.some(
            (command) =>
                command.option === "INSERT" &&
                command.table === "study_library_references" &&
                command.values.source_entry_id ===
                    command.values.target_entry_id,
        ),
        false,
    );
    const packInsert = commands.find(
        (command) =>
            command.option === "INSERT" &&
            command.table === "study_library_content_packs",
    );
    assert.equal(
        packInsert?.option === "INSERT"
            ? packInsert.values.metadata_json
            : undefined,
        JSON.stringify({ catalog: { featured: true } }),
    );
    assert.deepEqual(receipt.metadata, { catalog: { featured: true } });
});

test("authoritative content packs prune omitted records by default", async () => {
    const commands: StructuredDbCommand[] = [];
    const schema = {
        id: "japanese",
        version: 1,
        namespace: "ja",
        language: "ja",
        metadata: { labels: { en: "Japanese" } },
        layers: [
            { id: "characters", metadata: { labels: { en: "Characters" } } },
        ],
    };
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (callback) => callback(db),
        executeCommand: async (command) => {
            commands.push(command);
            if (
                command.option === "SELECT" &&
                command.table === "study_library_entries" &&
                command.columns?.includes("provider_modified") &&
                command.where?.some((clause) => clause.column === "created_by")
            ) {
                return { rows: [{ id: "removed-entry" }] };
            }
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
    await new LibraryStore(db).ingestContentPack({
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
        records: [{ id: "current", layer: "characters", label: "Current" }],
        assets: [],
    });
    assert.equal(
        commands.some(
            (command) =>
                command.option === "DELETE" &&
                command.table === "study_library_entries" &&
                command.where?.[0]?.value === "removed-entry",
        ),
        true,
    );
    assert.equal(
        commands.filter(
            (command) =>
                command.option === "DELETE" &&
                command.table === "study_library_references" &&
                command.where?.[0]?.value === "removed-entry",
        ).length,
        2,
    );
    assert.equal(
        commands.some(
            (command) =>
                command.option === "DELETE" &&
                command.table === "study_library_viewed_entries",
        ),
        false,
    );
});

test("content packs preserve provider records after a user modifies them", async () => {
    const commands: StructuredDbCommand[] = [];
    const manifest = {
        id: "study-language-ja",
        publisher: "Cognis Labs HQ",
        version: "2.0.0",
        contentRevision: "2",
        namespace: "ja",
        schema: "schema.json",
        content: "data",
        license: { id: "CC-BY-4.0" },
    };
    const schema = {
        id: "japanese",
        version: 1,
        namespace: "ja",
        language: "ja",
        metadata: { labels: { en: "Japanese" } },
        layers: [
            { id: "characters", metadata: { labels: { en: "Characters" } } },
        ],
    };
    const protectedId = contentEntryId(manifest, "neko");
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (callback) => callback(db),
        executeCommand: async (command) => {
            commands.push(command);
            if (
                command.option === "SELECT" &&
                command.table === "study_library_entries" &&
                command.columns?.includes("provider_modified") &&
                command.where?.some(({ column }) => column === "created_by")
            ) {
                return {
                    rows: [{ id: protectedId, provider_modified: true }],
                };
            }
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
    await new LibraryStore(db).ingestContentPack({
        root: "/content",
        manifest,
        schema,
        digest: "digest-two",
        records: [
            { id: "neko", layer: "characters", label: "Provider version" },
        ],
        assets: [],
    });
    assert.equal(
        commands.some(
            (command) =>
                command.option === "INSERT" &&
                command.table === "study_library_entries" &&
                command.values.id === protectedId,
        ),
        false,
    );
    assert.equal(
        commands.some(
            (command) =>
                command.option === "DELETE" &&
                command.table === "study_library_references" &&
                command.where?.some(({ value }) => value === protectedId),
        ),
        false,
    );
});

test("content packs retain omitted records only when explicitly requested", async () => {
    const commands: StructuredDbCommand[] = [];
    const schema = {
        id: "japanese",
        version: 1,
        namespace: "ja",
        language: "ja",
        metadata: { labels: { en: "Japanese" } },
        layers: [],
    };
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (callback) => callback(db),
        executeCommand: async (command) => {
            commands.push(command);
            if (command.option === "SELECT") return { rows: [] };
            return { rowCount: 1 };
        },
    };
    await new LibraryStore(db).ingestContentPack({
        root: "/content",
        manifest: {
            id: "study-language-ja",
            publisher: "Cognis Labs HQ",
            version: "2.0.0",
            contentRevision: "2",
            namespace: "ja",
            schema: "schema.json",
            content: "data",
            pruneOmittedRecords: false,
            license: { id: "CC-BY-4.0" },
        },
        schema,
        digest: "digest-two",
        records: [],
        assets: [],
    });
    assert.equal(
        commands.some(
            (command) =>
                command.option === "SELECT" &&
                command.table === "study_library_entries" &&
                command.where?.some((clause) => clause.column === "created_by"),
        ),
        true,
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
                if (command.columns?.includes("schema_id")) {
                    return {
                        rows: [
                            {
                                schema_id: "japanese",
                                schema_version: 1,
                                layer: "words",
                            },
                        ],
                    };
                }
                if (!command.columns) {
                    const id = String(command.where?.[0]?.value);
                    return {
                        rows: [
                            {
                                id,
                                scope: "global",
                                scope_id: "global",
                                schema_id: "japanese",
                                schema_version: 1,
                                layer: "words",
                                language: "ja",
                                label: id,
                                fields_json: "{}",
                                created_by: "admin",
                                created_at: "2026-09-12T00:00:00.000Z",
                                updated_at: "2026-09-12T00:00:00.000Z",
                            },
                        ],
                    };
                }
                return { rows: [{ content_hash: "hash-one" }] };
            }
            if (
                command.option === "SELECT" &&
                command.table === "study_library_schemas"
            ) {
                return {
                    rows: [
                        {
                            schema_json: JSON.stringify({
                                layers: [
                                    {
                                        id: "words",
                                        relationships: [
                                            {
                                                id: "contains",
                                                onDelete: "cascade",
                                            },
                                        ],
                                    },
                                ],
                            }),
                        },
                    ],
                };
            }
            if (
                command.option === "SELECT" &&
                command.table === "study_library_references"
            ) {
                const target = command.where?.[0]?.value;
                if (target === "entry-one")
                    return {
                        rows: [
                            {
                                source_entry_id: "word-one",
                                relation: "contains",
                            },
                        ],
                    };
                if (target === "word-one")
                    return {
                        rows: [
                            {
                                source_entry_id: "sentence-one",
                                relation: "contains",
                            },
                        ],
                    };
                return { rows: [] };
            }
            return { rowCount: 1 };
        },
    };

    let authorizedIds: string[] = [];
    const deleted = await new LibraryStore(db).deleteEntries(
        ["entry-one"],
        "admin",
        true,
        async (entries) => {
            authorizedIds = entries.map((entry) => entry.id);
        },
    );

    assert.deepEqual(deleted, ["entry-one", "word-one", "sentence-one"]);
    assert.deepEqual(authorizedIds, deleted);

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
        6,
    );
    assert.equal(
        commands.filter(
            (command) =>
                command.option === "DELETE" &&
                command.table === "study_library_entries",
        ).length,
        3,
    );
});

test("deletion traversal honors restrict and detach relationship policies", async () => {
    const policy = { value: "detach" };
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (callback) => callback(db),
        executeCommand: async (command) => {
            if (command.table === "study_library_references") {
                return {
                    rows: [
                        { source_entry_id: "word-one", relation: "meaning" },
                    ],
                };
            }
            if (command.table === "study_library_entries") {
                return {
                    rows: [
                        {
                            schema_id: "japanese",
                            schema_version: 1,
                            layer: "words",
                        },
                    ],
                };
            }
            if (command.table === "study_library_schemas") {
                return {
                    rows: [
                        {
                            schema_json: JSON.stringify({
                                layers: [
                                    {
                                        id: "words",
                                        relationships: [
                                            {
                                                id: "meaning",
                                                onDelete: policy.value,
                                            },
                                        ],
                                    },
                                ],
                            }),
                        },
                    ],
                };
            }
            return { rows: [] };
        },
    };
    const store = new LibraryStore(db);
    assert.deepEqual(await store.resolveDeletionCascade(["definition-one"]), [
        "definition-one",
    ]);
    policy.value = "restrict";
    await assert.rejects(
        store.resolveDeletionCascade(["definition-one"]),
        /relationship_delete_restricted/,
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

test("entry updates replace editable fields and relationships atomically", async () => {
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
                return {
                    rows: [
                        {
                            id: "entry-1",
                            scope: "global",
                            scope_id: "global",
                            schema_id: "japanese",
                            schema_version: 1,
                            layer: "words",
                            language: "ja",
                            label: "updated",
                            fields_json: "{}",
                            created_by: "ada",
                            created_at: "2026-01-01T00:00:00Z",
                            updated_at: "2026-01-02T00:00:00Z",
                        },
                    ],
                };
            }
            if (command.option === "SELECT") return { rows: [] };
            return { rowCount: 1 };
        },
    };
    await new LibraryStore(db).update(
        "entry-1",
        {
            schemaId: "japanese",
            schemaVersion: 2,
            layer: "words",
            label: "updated",
            fields: {},
            references: [{ entryId: "definition-1", relation: "means" }],
        },
        true,
    );
    assert.ok(
        commands.some(
            (command) =>
                command.option === "UPDATE" &&
                command.set.label === "updated" &&
                command.set.schema_version === 2,
        ),
    );
    assert.ok(
        commands.some(
            (command) =>
                command.option === "UPDATE" &&
                command.set.provider_modified === true,
        ),
    );
    assert.ok(
        commands.some(
            (command) =>
                command.option === "DELETE" &&
                command.table === "study_library_references",
        ),
    );
    assert.ok(
        commands.some(
            (command) =>
                command.option === "INSERT" &&
                command.table === "study_library_references",
        ),
    );
});
