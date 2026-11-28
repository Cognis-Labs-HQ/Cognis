import test from "node:test";
import assert from "node:assert/strict";
import type { DatabaseExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDatabaseTableDefinition } from "../../../../gateways/db/reuse/db-table.js";
import { DatabaseInternalNotificationStore } from "../db-store.js";

test("internal notification schema uses a portable read-state identifier", async () => {
    let tableDefinition: StructuredDatabaseTableDefinition | undefined;
    const database = {
        async ensureTable(definition: StructuredDatabaseTableDefinition) {
            tableDefinition = definition;
        },
    } as DatabaseExecutor;

    await new DatabaseInternalNotificationStore(
        database,
        "unused",
    ).ensureSchema();

    assert.equal(tableDefinition?.name, "internal_notifications");
    assert.deepEqual(
        tableDefinition?.columns.find((column) => column.name === "is_read"),
        {
            name: "is_read",
            type: "integer",
            notNull: true,
            default: 0,
            renamedFrom: "read",
        },
    );
});
