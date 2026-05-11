import test from "node:test";
import assert from "node:assert/strict";
import { DbMessagesStore } from "../store.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { StructuredDbUpdateCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../../../gateways/db/reuse/db-table.js";

function createRecordingExecutor() {
    const tableDefs: Array<StructuredDbTableDef> = [];
    const commandCalls: Array<StructuredDbCommand> = [];
    const db: DbExecutor = {
        async ensureTable(def: StructuredDbTableDef) {
            tableDefs.push(def);
        },
        async executeCommand(command: StructuredDbCommand) {
            commandCalls.push(command);
            return { rows: [] };
        },
        async transaction<T>(callback: (executor: DbExecutor) => Promise<T>) {
            return callback(db);
        },
    };
    return { db, tableDefs, commandCalls };
}

test("messages schema uses portable integer default for muted flag", async () => {
    const { db, tableDefs } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.ensureSchema();

    const membersTableDef = tableDefs.find(
        (def) => def.name === "chatroom_members",
    );
    assert.ok(membersTableDef, "chatroom_members table should be ensured");

    const mutedCol = membersTableDef.columns.find(
        (col) => col.name === "muted",
    );
    assert.ok(mutedCol, "muted column should exist");
    assert.equal(
        mutedCol.type,
        "integer",
        "muted column should use integer type",
    );
    assert.equal(mutedCol.default, 0, "muted column should default to 0");
    assert.equal(mutedCol.notNull, true, "muted column should be NOT NULL");
    assert.notEqual(
        mutedCol.type,
        "boolean",
        "muted column must not use boolean type",
    );
});

test("messages setMuted uses executeCommand with integer muted value", async () => {
    const { db, commandCalls } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.setMuted("room-1", "account-1", true);

    const updateCmd = commandCalls.find(
        (cmd): cmd is StructuredDbUpdateCommand =>
            cmd.option === "UPDATE" && cmd.table === "chatroom_members",
    );
    assert.ok(updateCmd);
    assert.equal(updateCmd.set.muted, 1);
});
