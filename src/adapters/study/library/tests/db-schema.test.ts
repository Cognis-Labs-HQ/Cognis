import assert from "node:assert/strict";
import test from "node:test";
import { ensureLibraryStoreSchema } from "../db-schema.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbTableDef } from "../../../../gateways/db/reuse/db-table.js";

test("Library schema declares scoped lookup indexes and Unicode asset fields", async () => {
    const definitions: StructuredDbTableDef[] = [];
    const executor: DbExecutor = {
        async ensureTable(definition) {
            definitions.push(definition);
        },
        async executeCommand() {
            throw new Error("unexpected_query");
        },
        async transaction() {
            throw new Error("unexpected_transaction");
        },
    };
    await ensureLibraryStoreSchema(executor);
    const entries = definitions.find(
        ({ name }) => name === "study_library_entries",
    )!;
    assert.deepEqual(entries.indexes, [
        { columns: ["scope_id", "schema_id", "layer"] },
        { columns: ["scope_id", "source_record_id"] },
    ]);
    assert.deepEqual(
        entries.columns.find(({ name }) => name === "label"),
        { name: "label", type: "text", notNull: true },
    );
    const assets = definitions.find(
        ({ name }) => name === "study_library_content_pack_assets",
    )!;
    for (const name of ["publisher", "asset_path"])
        assert.deepEqual(
            assets.columns.find((column) => column.name === name),
            { name, type: "text", notNull: true },
        );
});
