import test from "node:test";
import assert from "node:assert/strict";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbTableDef } from "../../../../gateways/db/reuse/db-table.js";
import { DbInternalNotificationStore } from "../db-store.js";

test("internal notification schema uses a portable read-state identifier", async () => {
    let tableDefinition: StructuredDbTableDef | undefined;
    const db = {
        async ensureTable(definition: StructuredDbTableDef) {
            tableDefinition = definition;
        },
    } as DbExecutor;

    await new DbInternalNotificationStore(db, "unused").ensureSchema();

    assert.equal(tableDefinition?.name, "internal_notifications");
    assert.deepEqual(
        tableDefinition?.columns.find((column) => column.name === "is_read"),
        {
            name: "is_read",
            type: "integer",
            notNull: true,
            default: 0,
        },
    );
});
