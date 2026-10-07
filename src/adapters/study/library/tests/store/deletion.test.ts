import assert from "node:assert/strict";
import test from "node:test";
import type { StructuredDbCommand } from "../../../../../gateways/db/reuse/db-command.js";
import type { DbExecutor } from "../../../../../gateways/db/reuse/db-executor.js";
import { LibraryStore } from "../../store.js";
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
                                schema_id: "mock-language",
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
                                schema_id: "mock-language",
                                schema_version: 1,
                                layer: "words",
                                language: "x-mock",
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
                            schema_id: "mock-language",
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
    assert.deepEqual(
        await new LibraryStore(db).resolveDeletionCascade(
            ["root"],
            undefined,
            true,
        ),
        ["root", "word-one"],
    );
    await assert.rejects(
        store.resolveDeletionCascade(["definition-one"]),
        /relationship_delete_restricted/,
    );
});

test("restricted dependants included by another cascade are resolved before restriction checks", async () => {
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (callback) => callback(db),
        executeCommand: async (command) => {
            if (command.table === "study_library_references") {
                const id = command.where?.[0]?.value;
                return {
                    rows:
                        id === "root"
                            ? [
                                  {
                                      source_entry_id: "child",
                                      relation: "restrict",
                                  },
                                  {
                                      source_entry_id: "bridge",
                                      relation: "cascade",
                                  },
                              ]
                            : id === "bridge"
                              ? [
                                    {
                                        source_entry_id: "child",
                                        relation: "cascade",
                                    },
                                ]
                              : [],
                };
            }
            if (command.table === "study_library_entries")
                return {
                    rows: [
                        {
                            schema_id: "test",
                            schema_version: 1,
                            layer: "units",
                        },
                    ],
                };
            if (command.table === "study_library_schemas")
                return {
                    rows: [
                        {
                            schema_json: JSON.stringify({
                                layers: [
                                    {
                                        id: "units",
                                        relationships: [
                                            {
                                                id: "restrict",
                                                onDelete: "restrict",
                                            },
                                            {
                                                id: "cascade",
                                                onDelete: "cascade",
                                            },
                                        ],
                                    },
                                ],
                            }),
                        },
                    ],
                };
            return { rows: [] };
        },
    };
    assert.deepEqual(
        await new LibraryStore(db).resolveDeletionCascade(["root"]),
        ["root", "bridge", "child"],
    );
});
