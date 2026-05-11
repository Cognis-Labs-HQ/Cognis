import test from "node:test";
import assert from "node:assert/strict";
import { DbMessagesStore } from "../store.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";

function createRecordingExecutor() {
    const sqlCalls: Array<{ sql: string; params?: unknown[] }> = [];
    const commandCalls: Array<StructuredDbCommand> = [];
    const db: DbExecutor = {
        async execute(sql: string, params?: unknown[]) {
            sqlCalls.push({ sql, params });
            return { rows: [] };
        },
        async executeCommand(command: StructuredDbCommand) {
            commandCalls.push(command);
            return { rows: [] };
        },
    };
    return { db, sqlCalls, commandCalls };
}

test("messages schema uses portable integer default for muted flag", async () => {
    const { db, sqlCalls } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.ensureSchema();

    const membersSchema = sqlCalls.find((call) =>
        call.sql.includes("CREATE TABLE IF NOT EXISTS chatroom_members"),
    );
    assert.ok(membersSchema);
    assert.match(membersSchema.sql, /muted INTEGER NOT NULL DEFAULT 0/);
    assert.doesNotMatch(membersSchema.sql, /BOOLEAN/);
});

test("messages setMuted uses executeCommand with integer muted value", async () => {
    const { db, commandCalls } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.setMuted("room-1", "account-1", true);

    const updateCmd = commandCalls.find(
        (cmd) => cmd.option === "UPDATE" && cmd.table === "chatroom_members",
    );
    assert.ok(updateCmd);
    assert.equal((updateCmd as any).set.muted, 1);
});
