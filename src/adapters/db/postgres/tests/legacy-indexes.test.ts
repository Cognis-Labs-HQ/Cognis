import assert from "node:assert/strict";
import test from "node:test";
import { removeSupersededLegacyIndexes } from "../index.js";
import type { RawDbExecutor } from "../../../../gateways/db/reuse/db-executor.js";

const primary = [
    "source_entry_id",
    "target_entry_id",
    "relation",
    "group_index",
    "position",
];
const old = primary.filter((column) => column !== "group_index");
const definition = {
    name: "study_library_references",
    columns: primary.map((name) => ({ name, type: "text" as const })),
    primaryKey: primary,
};

test("schema initialization repairs an already-expanded key and preserves declared uniqueness", async () => {
    for (const declared of [false, true]) {
        const statements: string[] = [];
        let active = true;
        const executor = {
            execute: async (sql: string) => {
                statements.push(sql);
                if (sql.startsWith("DROP INDEX")) active = false;
                return {
                    rows: sql.includes("FROM pg_index")
                        ? [
                              ...(active
                                  ? [
                                        {
                                            index_name:
                                                "uq_study_library_references_208386997ea7",
                                            schema_name: "public",
                                            columns: old,
                                        },
                                    ]
                                  : []),
                              {
                                  index_name: "operator_unique_index",
                                  schema_name: "public",
                                  columns: old,
                              },
                              {
                                  index_name:
                                      "uq_study_library_references_custom",
                                  schema_name: "public",
                                  columns: primary,
                              },
                          ]
                        : [],
                };
            },
        } as unknown as RawDbExecutor;
        const current = { ...definition, uniqueKeys: declared ? [old] : [] };
        await removeSupersededLegacyIndexes(executor, current);
        await removeSupersededLegacyIndexes(executor, current);
        assert.deepEqual(
            statements.filter((sql) => sql.startsWith("DROP")),
            declared
                ? []
                : [
                      'DROP INDEX IF EXISTS "public"."uq_study_library_references_208386997ea7"',
                  ],
        );
    }
});
